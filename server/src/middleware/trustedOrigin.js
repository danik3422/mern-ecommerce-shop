import { env } from '../config/env.js'
import { forbidden } from '../utils/HttpError.js'

/**
 * CSRF protection for the endpoints that act on the refresh-token cookie.
 *
 * A cookie is attached by the browser automatically, so another site could try to make a
 * visitor's browser call /auth/refresh or /auth/logout. Two layers stop that:
 * 1. SameSite=Lax — browsers do not send the cookie with cross-site POST requests;
 * 2. this check — browsers always state the page that started a POST in the `Origin`
 *    header (older ones at least in `Referer`), and scripts cannot forge it. Only the shop's
 *    own origins (CLIENT_URL) are accepted.
 *
 * Why not a CSRF token: the cookie is used by two endpoints only and the API is otherwise
 * stateless (Bearer tokens cannot be sent by another site), so an Origin check gives the same
 * protection without storing per-session CSRF secrets.
 */

const originOf = (url) => {
	try {
		return new URL(url).origin
	} catch {
		return null
	}
}

// in development any localhost port may run a client (several dev stacks side by side)
const isLocalDevOrigin = (origin) =>
	!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

export const isTrustedOrigin = (origin) =>
	Boolean(origin) && (env.CLIENT_ORIGINS.includes(origin) || isLocalDevOrigin(origin))

/**
 * The API's own address. In production it serves the shop itself (app.js serveClient), so a
 * page of the same origin is always fine — even on a custom domain missing from CLIENT_URL.
 * `req.protocol` respects TRUST_PROXY; a browser cannot fake the Host of a cross-site request.
 */
const ownOrigin = (req) => `${req.protocol}://${req.get('host')}`

const requestOrigin = (req) => req.get('origin') ?? originOf(req.get('referer'))

/**
 * `strict`: the request must name a trusted origin (refresh, logout — they use the cookie).
 * Otherwise only a foreign origin is rejected, so API clients without a browser can still
 * sign in, while a third-party page cannot sign a visitor in to another account (login CSRF).
 */
export const requireTrustedOrigin =
	({ strict = true } = {}) =>
	(req, _res, next) => {
		const origin = requestOrigin(req)
		if (!origin && !strict) return next()
		if (!isTrustedOrigin(origin) && origin !== ownOrigin(req)) {
			throw forbidden('Request origin is not allowed')
		}
		next()
	}
