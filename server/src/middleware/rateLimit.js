import { rateLimit } from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000

/** Limits brute-force attempts on login/register. Only failed requests are counted. */
export const createAuthLimiter = (limit) =>
	rateLimit({
		windowMs: FIFTEEN_MINUTES,
		limit,
		skipSuccessfulRequests: true,
		standardHeaders: 'draft-8',
		legacyHeaders: false,
		message: { message: 'Too many attempts, please try again later' },
	})

/**
 * Refresh tokens are 256-bit random values, so guessing is hopeless; this limit only stops a
 * client from hammering the endpoint. More generous than sign-in: every open tab refreshes.
 */
export const createRefreshLimiter = (authLimit) =>
	rateLimit({
		windowMs: FIFTEEN_MINUTES,
		limit: authLimit * 3,
		skipSuccessfulRequests: true,
		standardHeaders: 'draft-8',
		legacyHeaders: false,
		message: { message: 'Too many attempts, please try again later' },
	})
