import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ALGORITHM = 'HS256'

/**
 * Short-lived access token (JWT). It names the user (`sub`) and the session it belongs to
 * (`sid`), so requireAuth can reject it as soon as that session is revoked — without
 * waiting for the token to expire.
 *
 * @returns {{ accessToken: string, expiresIn: number }} expiresIn in seconds
 */
export const signAccessToken = (userId, sessionId) => {
	const accessToken = jwt.sign({ sid: String(sessionId) }, env.JWT_SECRET, {
		subject: String(userId),
		expiresIn: env.ACCESS_TOKEN_TTL,
		algorithm: ALGORITHM,
	})
	const { exp, iat } = jwt.decode(accessToken)
	return { accessToken, expiresIn: exp - iat }
}

/**
 * @returns {{ userId: string, sessionId: string } | null} null if the token is invalid,
 * expired or was issued before sessions existed (no `sid`)
 */
export const verifyAccessToken = (token) => {
	try {
		const { sub, sid } = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] })
		return sub && sid ? { userId: sub, sessionId: sid } : null
	} catch {
		return null
	}
}
