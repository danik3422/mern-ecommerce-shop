import { env } from '../config/env.js'

/**
 * The refresh-token cookie.
 * - httpOnly: page scripts (and so any XSS) cannot read the token;
 * - Secure (production): sent over HTTPS only;
 * - SameSite=Lax (default): not sent with cross-site POST requests (first CSRF layer, the
 *   Origin check in middleware/trustedOrigin.js is the second);
 * - Path=/api/auth: the browser sends it only to the auth endpoints, not with every API call.
 */
export const REFRESH_COOKIE = 'refreshToken'
const COOKIE_PATH = '/api/auth'

const cookieOptions = () => ({
	httpOnly: true,
	secure: env.cookieSecure,
	sameSite: env.COOKIE_SAMESITE,
	path: COOKIE_PATH,
	...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
})

export const setRefreshCookie = (res, token) =>
	res.cookie(REFRESH_COOKIE, token, {
		...cookieOptions(),
		maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
	})

export const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions())

/**
 * Reads one cookie from the Cookie header. Only this cookie is ever needed, so a few lines
 * replace the cookie-parser dependency.
 */
export const readRefreshCookie = (req) => {
	for (const pair of (req.get('cookie') ?? '').split(';')) {
		const separator = pair.indexOf('=')
		if (separator === -1 || pair.slice(0, separator).trim() !== REFRESH_COOKIE) continue
		try {
			return decodeURIComponent(pair.slice(separator + 1).trim())
		} catch {
			return null
		}
	}
	return null
}
