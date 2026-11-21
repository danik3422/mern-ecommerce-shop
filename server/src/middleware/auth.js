import { User } from '../models/User.js'
import { PERMISSIONS, hasPermission, isStaff } from '../services/permissions.js'
import { verifyAccessToken } from '../services/token.js'
import { forbidden, unauthorized } from '../utils/HttpError.js'

const readBearerToken = (req) => {
	const [scheme, token] = (req.get('authorization') ?? '').split(' ')
	return scheme === 'Bearer' && token ? token : null
}

/**
 * Requires a valid access token of an existing user.
 * The user is loaded from the database on every request, so deleted or blocked users
 * and changed permissions take effect immediately, not when the token expires.
 * Runs once per request: later guards reuse `req.user`.
 *
 * `req.user`: `{ id, role, isOwner, permissions, isAdmin }` — isAdmin = any staff account
 */
export const requireAuth = async (req, _res, next) => {
	if (req.user) return next()
	const token = readBearerToken(req)
	if (!token) throw unauthorized()

	const userId = verifyAccessToken(token)
	const user = userId && (await User.findById(userId).lean())
	if (!user) throw unauthorized('Session expired, please sign in again')
	// 401, so the client ends the session
	if (user.blocked) throw unauthorized('This account is blocked')

	req.user = {
		id: user._id.toString(),
		role: user.role,
		isOwner: Boolean(user.isOwner),
		permissions: user.permissions ?? [],
		isAdmin: isStaff(user),
	}
	next()
}

/** Like requireAuth, but lets anonymous requests through (req.user stays undefined). */
export const optionalAuth = async (req, res, next) => {
	if (!readBearerToken(req)) return next()
	return requireAuth(req, res, next)
}

/** Any staff account (e.g. for the admin sidebar counts); areas use requirePermission. */
export const requireAdmin = [
	requireAuth,
	(req, _res, next) => {
		if (!req.user.isAdmin) throw forbidden()
		next()
	},
]

/**
 * Staff with the permission `name` (see services/permissions.js); owners always pass.
 * Customers and staff without it get 403.
 */
export const requirePermission = (name) => {
	if (!PERMISSIONS[name]) throw new Error(`Unknown permission "${name}"`)
	return [
		requireAuth,
		(req, _res, next) => {
			if (!hasPermission(req.user, name)) {
				throw forbidden(req.user.isAdmin ? `You need the "${name}" permission` : undefined)
			}
			next()
		},
	]
}

/** Owners only (e.g. the activity log). */
export const requireOwner = [
	requireAuth,
	(req, _res, next) => {
		if (!(req.user.isAdmin && req.user.isOwner)) throw forbidden()
		next()
	},
]
