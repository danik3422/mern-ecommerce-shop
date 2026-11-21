import { createHash, randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Session } from '../models/Session.js'
import { describeUserAgent } from './userAgent.js'

/**
 * Sessions and refresh tokens.
 *
 * A refresh token looks like `<sessionId>.<secret>`: the id finds the session, the 256-bit
 * random secret proves possession. Only `sha256(secret)` is stored. A slow hash such as bcrypt
 * is not needed here — unlike passwords, the secret is random and cannot be guessed.
 *
 * Every refresh rotates the token (the old one stops working). Because the session id is part
 * of the token, an old token is still recognised after rotation: presenting it means that two
 * parties hold copies of the token (one of them probably stole it), so the whole session is
 * revoked and both have to sign in again — "refresh-token reuse detection".
 */

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Two tabs may refresh at the same moment with the same cookie. The first one rotates the
 * token; the second one, arriving within this window with the just-replaced token, gets an
 * access token but no new cookie (the browser already stored the one from the first response)
 * instead of being treated as token theft.
 */
export const ROTATION_GRACE_MS = 20_000

const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const newSecret = () => randomBytes(32).toString('base64url')
const expiryFromNow = () => new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS)

/** `::ffff:83.24.1.2` (IPv4 seen through an IPv6 socket) → `83.24.1.2` */
const normalizeIp = (ip) => ip?.replace(/^::ffff:/, '')

/** Device details of a request; `req.ip` respects TRUST_PROXY (see app.js). */
const clientInfo = (req) => ({
	...describeUserAgent(req.get('user-agent')),
	ip: normalizeIp(req.ip),
})

/** Splits `<sessionId>.<secret>`; null for anything malformed. */
const parseRefreshToken = (token) => {
	const [sessionId, secret, extra] = String(token ?? '').split('.')
	if (extra !== undefined || !secret || !mongoose.isValidObjectId(sessionId)) return null
	return { sessionId, secretHash: sha256(secret) }
}

/** Starts a session after signing in. @returns {{ session, refreshToken }} */
export const createSession = async (userId, req) => {
	const secret = newSecret()
	const session = await Session.create({
		user: userId,
		tokenHash: sha256(secret),
		expiresAt: expiryFromNow(),
		...clientInfo(req),
	})
	return { session, refreshToken: `${session.id}.${secret}` }
}

const isActive = (session) => !session.revokedAt && session.expiresAt > new Date()

/**
 * Exchanges a refresh token for a new one.
 *
 * @returns {Promise<
 *   | { status: 'rotated', session, refreshToken }
 *   | { status: 'concurrent', session }   // grace period: keep the cookie the browser has
 *   | { status: 'invalid' }               // unknown, expired, revoked or reused token
 * >}
 */
export const rotateRefreshToken = async (token, req) => {
	const parsed = parseRefreshToken(token)
	if (!parsed) return { status: 'invalid' }
	const { sessionId, secretHash } = parsed

	const secret = newSecret()
	const now = new Date()
	// compare-and-swap: only the request that still holds the current token can rotate it,
	// so two parallel refreshes can never both receive a fresh token
	const rotated = await Session.findOneAndUpdate(
		{ _id: sessionId, tokenHash: secretHash, revokedAt: null, expiresAt: { $gt: now } },
		{
			$set: {
				tokenHash: sha256(secret),
				previousTokenHash: secretHash,
				rotatedAt: now,
				lastUsedAt: now,
				expiresAt: expiryFromNow(),
				...clientInfo(req),
			},
		},
		{ returnDocument: 'after' },
	)
	if (rotated)
		return { status: 'rotated', session: rotated, refreshToken: `${sessionId}.${secret}` }

	const session = await Session.findById(sessionId)
	if (!session || !isActive(session)) return { status: 'invalid' }

	const justRotated = now - session.rotatedAt < ROTATION_GRACE_MS
	if (session.previousTokenHash === secretHash && justRotated) {
		return { status: 'concurrent', session }
	}

	// an older token of a live session: someone else has a copy of it
	await revokeSession(session._id, 'reuse')
	console.warn(`Refresh token reuse detected, session ${session.id} revoked`)
	return { status: 'invalid' }
}

/**
 * The session a refresh token belongs to: its current token, or the one replaced moments ago
 * (a sign-out racing with a refresh in another tab must still end the session).
 */
export const findSessionByToken = async (token) => {
	const parsed = parseRefreshToken(token)
	if (!parsed) return null
	const session = await Session.findById(parsed.sessionId)
	if (!session) return null
	const justRotated =
		session.previousTokenHash === parsed.secretHash &&
		Date.now() - session.rotatedAt < ROTATION_GRACE_MS
	return session.tokenHash === parsed.secretHash || justRotated ? session : null
}

/**
 * Used by requireAuth on every request (a lookup by _id), so a revoked session stops
 * working at once instead of when its access token expires.
 */
export const isSessionActive = (sessionId, userId) =>
	mongoose.isValidObjectId(sessionId)
		? Session.exists({
				_id: sessionId,
				user: userId,
				revokedAt: null,
				expiresAt: { $gt: new Date() },
			})
		: null

/** Ends one session; `userId` limits it to that user's sessions. @returns `{ modifiedCount }` */
export const revokeSession = (sessionId, reason, { userId } = {}) =>
	Session.updateOne(
		{ _id: sessionId, revokedAt: null, ...(userId && { user: userId }) },
		{ revokedAt: new Date(), revokedReason: reason },
	)

/**
 * Signs a user out everywhere — or everywhere but `exceptSessionId` (the device that asked).
 * Called after a password change, blocking, deactivation and account removal.
 * @returns {Promise<number>} how many sessions were revoked
 */
export const revokeUserSessions = async (userId, reason, { exceptSessionId } = {}) => {
	const filter = { user: userId, revokedAt: null }
	if (exceptSessionId) filter._id = { $ne: exceptSessionId }
	const { modifiedCount } = await Session.updateMany(filter, {
		revokedAt: new Date(),
		revokedReason: reason,
	})
	return modifiedCount
}

const activeFilter = (userId) => ({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })

export const countActiveSessions = (userId) => Session.countDocuments(activeFilter(userId))

/**
 * Hides the host part of an address — enough for "is this my network?", not more:
 * `83.24.120.7` → `83.24.x.x`, `2a02:a31a:1:2::7` → `2a02:a31a:…`
 */
export const maskIp = (ip) => {
	if (!ip) return null
	// this computer (development): nothing to hide
	if (ip === '::1' || ip.startsWith('127.')) return 'localhost'
	if (ip.includes('.')) return ip.split('.').slice(0, 2).concat('x', 'x').join('.')
	return `${ip.split(':').slice(0, 2).join(':')}:…`
}

const toPublicSession = (session, currentSessionId) => ({
	id: session._id.toString(),
	browser: session.browser ?? null,
	os: session.os ?? null,
	mobile: Boolean(session.mobile),
	ip: maskIp(session.ip),
	createdAt: session.createdAt,
	lastUsedAt: session.lastUsedAt,
	current: session._id.toString() === currentSessionId,
})

/**
 * Active sessions of a user, the current one first, then the most recently used.
 * `onlyCurrent` — for shared demo accounts: visitors must not see each other's devices.
 */
export const listSessions = async (userId, currentSessionId, { onlyCurrent = false } = {}) => {
	const filter = activeFilter(userId)
	if (onlyCurrent) filter._id = currentSessionId
	const sessions = await Session.find(filter).sort({ lastUsedAt: -1 }).limit(100).lean()
	return sessions
		.map((session) => toPublicSession(session, currentSessionId))
		.sort((a, b) => Number(b.current) - Number(a.current))
}
