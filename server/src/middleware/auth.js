import { User } from '../models/User.js'
import { verifyAccessToken } from '../services/token.js'
import { forbidden, unauthorized } from '../utils/HttpError.js'

const readBearerToken = (req) => {
	const [scheme, token] = (req.get('authorization') ?? '').split(' ')
	return scheme === 'Bearer' && token ? token : null
}

/**
 * Requires a valid access token of an existing user.
 * The user is loaded from the database on every request, so deleted users
 * and revoked admin rights take effect immediately, not when the token expires.
 */
export const requireAuth = async (req, _res, next) => {
	const token = readBearerToken(req)
	if (!token) throw unauthorized()

	const userId = verifyAccessToken(token)
	const user = userId && (await User.findById(userId).lean())
	if (!user) throw unauthorized('Session expired, please sign in again')

	req.user = { id: user._id.toString(), isAdmin: user.isAdmin }
	next()
}

/** Like requireAuth, but lets anonymous requests through (req.user stays undefined). */
export const optionalAuth = async (req, res, next) => {
	if (!readBearerToken(req)) return next()
	return requireAuth(req, res, next)
}

export const requireAdmin = [
	requireAuth,
	(req, _res, next) => {
		if (!req.user.isAdmin) throw forbidden()
		next()
	},
]
