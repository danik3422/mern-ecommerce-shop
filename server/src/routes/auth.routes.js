import { Router } from 'express'
import { demoLogin, login, register } from '../controllers/auth.controller.js'
import { createAuthLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { demoLoginBody, loginBody, registerBody } from '../validation/auth.js'

export const authRoutes = ({ rateLimit }) => {
	const router = Router()
	const limiter = createAuthLimiter(rateLimit)

	router.post('/register', limiter, validate({ body: registerBody }), register)
	router.post('/login', limiter, validate({ body: loginBody }), login)
	router.post('/demo', limiter, validate({ body: demoLoginBody }), demoLogin)

	return router
}
