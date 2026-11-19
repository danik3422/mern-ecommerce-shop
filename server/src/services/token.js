import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ALGORITHM = 'HS256'

export const signAccessToken = (userId) =>
	jwt.sign({}, env.JWT_SECRET, {
		subject: String(userId),
		expiresIn: env.JWT_EXPIRES_IN,
		algorithm: ALGORITHM,
	})

/** Returns the user id stored in the token, or null if the token is invalid or expired. */
export const verifyAccessToken = (token) => {
	try {
		return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] }).sub ?? null
	} catch {
		return null
	}
}
