import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { DEMO_ACCOUNTS } from '../seed/demo.js'
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../services/authCookie.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import {
	createSession,
	findSessionByToken,
	listSessions,
	revokeSession,
	revokeUserSessions,
	rotateRefreshToken,
} from '../services/sessions.js'
import { signAccessToken } from '../services/token.js'
import { conflict, forbidden, notFound, unauthorized } from '../utils/HttpError.js'

/**
 * The session design (details in services/sessions.js and the README "Security" section):
 * - access token: a JWT valid for ACCESS_TOKEN_TTL (15 min), returned in the JSON body; the
 *   web client keeps it in memory only, API clients send it as `Authorization: Bearer`;
 * - refresh token: opaque, valid for SESSION_TTL_DAYS, only ever in an httpOnly cookie, and
 *   exchanged (rotated) by POST /auth/refresh for a new access token.
 */

const authBody = (user, session) => ({
	user: user.toJSON(),
	...signAccessToken(user._id, session._id),
})

/**
 * Starts a session for a user who just proved who they are. A refresh cookie this browser
 * still holds belongs to a session being replaced (e.g. switching accounts), so it is ended
 * instead of lingering in the "Active sessions" list.
 */
const signIn = async (req, res, user) => {
	const previous = await findSessionByToken(readRefreshCookie(req))
	if (previous) await revokeSession(previous._id, 'logout')

	const { session, refreshToken } = await createSession(user._id, req)
	setRefreshCookie(res, refreshToken)
	return authBody(user, session)
}

export const register = async (req, res) => {
	const { username, email, password, locale } = req.valid.body

	const taken = await User.exists({ $or: [{ username }, { email }] })
	if (taken) throw conflict('Username or email is already taken')

	// a parallel request may still win the race — the unique index then returns 409 as well
	const user = await User.create({
		username,
		email,
		passwordHash: await hashPassword(password),
		locale,
		// signing up also signs in
		lastLoginAt: new Date(),
	})
	res.status(201).json(await signIn(req, res, user))
}

export const login = async (req, res) => {
	const { login, password } = req.valid.body

	const user = await User.findOne({
		$or: [{ username: login }, { email: login.toLowerCase() }],
	}).select('+passwordHash')

	const passwordMatches = user?.passwordHash && (await verifyPassword(password, user.passwordHash))
	if (!passwordMatches) throw unauthorized('Wrong username/email or password')
	// told only after the right password, so blocking does not reveal which accounts exist
	if (user.blocked) throw forbidden('This account is blocked. Please contact the shop.')

	user.lastLoginAt = new Date()
	await User.updateOne({ _id: user._id }, { lastLoginAt: user.lastLoginAt })

	res.json(await signIn(req, res, user))
}

/**
 * POST /auth/demo — signs in to a shared demo account without a password.
 * Exists only in demo mode; the accounts are created by the demo seed / nightly reset.
 * Every visitor gets a session of their own, so signing out one visitor never affects another.
 */
export const demoLogin = async (req, res) => {
	if (!env.DEMO_MODE) throw notFound('Route')
	const { account } = req.valid.body
	const user = await User.findOne({ username: DEMO_ACCOUNTS[account].username, isDemo: true })
	if (!user) throw notFound('Demo account')

	user.lastLoginAt = new Date()
	await User.updateOne({ _id: user._id }, { lastLoginAt: user.lastLoginAt })
	res.json(await signIn(req, res, user))
}

/** Clears the cookie and answers 401, so the client knows it has to sign in again. */
const endSession = (res, message) => {
	clearRefreshCookie(res)
	throw unauthorized(message)
}

/**
 * POST /auth/refresh — exchanges the refresh cookie for a new access token and a new
 * refresh cookie (rotation). Called when the app starts and shortly before the access token
 * expires. `{ user, accessToken, expiresIn }`
 */
export const refresh = async (req, res) => {
	const token = readRefreshCookie(req)
	if (!token) throw unauthorized('Not signed in')

	const result = await rotateRefreshToken(token, req)
	if (result.status === 'invalid') endSession(res, 'Session expired, please sign in again')

	const user = await User.findById(result.session.user)
	if (!user || user.blocked) {
		await revokeSession(result.session._id, user ? 'blocked' : 'removed')
		endSession(res, user ? 'This account is blocked' : 'Session expired, please sign in again')
	}

	// a concurrent refresh keeps the cookie the parallel request has just set
	if (result.status === 'rotated') setRefreshCookie(res, result.refreshToken)
	res.json(authBody(user, result.session))
}

/** POST /auth/logout — ends this browser's session. Always succeeds (204). */
export const logout = async (req, res) => {
	const session = await findSessionByToken(readRefreshCookie(req))
	if (session) await revokeSession(session._id, 'logout')
	clearRefreshCookie(res)
	res.status(204).end()
}

/**
 * Shared demo accounts are used by many visitors at once. Each of them sees and can end only
 * their own session — otherwise one visitor could see others' devices and sign them all out.
 */
const DEMO_SESSIONS = 'Demo accounts are shared: you can only sign out this device'

/** GET /auth/sessions — the signed-in user's active sessions, `current: true` for this one. */
export const getSessions = async (req, res) => {
	const { id, sessionId, isDemo } = req.user
	res.json(await listSessions(id, sessionId, { onlyCurrent: isDemo }))
}

/** DELETE /auth/sessions/:id — signs out one device (it gets 401 on its next request). */
export const deleteSession = async (req, res) => {
	const { id: userId, sessionId, isDemo } = req.user
	const targetId = req.valid.params.id
	if (isDemo && targetId !== sessionId) throw forbidden(DEMO_SESSIONS)

	// scoped to the user: someone else's session id is simply "not found"
	const { modifiedCount } = await revokeSession(targetId, 'revoked', { userId })
	if (!modifiedCount) throw notFound('Session')
	if (targetId === sessionId) clearRefreshCookie(res)
	res.status(204).end()
}

/** POST /auth/sessions/revoke-others — signs out every device except this one. `{ revoked }` */
export const revokeOtherSessions = async (req, res) => {
	const { id, sessionId, isDemo } = req.user
	if (isDemo) throw forbidden(DEMO_SESSIONS)
	const revoked = await revokeUserSessions(id, 'others', { exceptSessionId: sessionId })
	res.json({ revoked })
}
