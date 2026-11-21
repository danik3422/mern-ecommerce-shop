import { Router } from 'express'
import * as auth from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { createAuthLimiter, createRefreshLimiter } from '../middleware/rateLimit.js'
import { requireTrustedOrigin } from '../middleware/trustedOrigin.js'
import { validate } from '../middleware/validate.js'
import { demoLoginBody, loginBody, registerBody } from '../validation/auth.js'
import { idParams } from '../validation/common.js'

export const authRoutes = ({ rateLimit }) => {
	const router = Router()
	const limiter = createAuthLimiter(rateLimit)
	const refreshLimiter = createRefreshLimiter(rateLimit)
	// sign-in sets the cookie: a foreign page must not sign a visitor in (login CSRF)
	const notForeign = requireTrustedOrigin({ strict: false })
	// these act on the cookie the browser attaches by itself: same-site pages only
	const sameSite = requireTrustedOrigin()

	router.post('/register', notForeign, limiter, validate({ body: registerBody }), auth.register)
	router.post('/login', notForeign, limiter, validate({ body: loginBody }), auth.login)
	router.post('/demo', notForeign, limiter, validate({ body: demoLoginBody }), auth.demoLogin)
	router.post('/refresh', sameSite, refreshLimiter, auth.refresh)
	router.post('/logout', sameSite, auth.logout)

	// "Active sessions" — authenticated with the Bearer token, the cookie is not used
	router.get('/sessions', requireAuth, auth.getSessions)
	router.post('/sessions/revoke-others', requireAuth, auth.revokeOtherSessions)
	router.delete('/sessions/:id', requireAuth, validate({ params: idParams }), auth.deleteSession)

	return router
}
