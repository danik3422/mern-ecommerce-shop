import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'node:path'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRoutes } from './routes/index.js'

/** Builds the Express app without starting it, so tests can use it directly. */
export const createApp = ({ authRateLimit = env.AUTH_RATE_LIMIT } = {}) => {
	const app = express()

	app.set('trust proxy', env.TRUST_PROXY)
	app.use(helmet())
	app.use(cors({ origin: env.CLIENT_ORIGINS }))
	// Stripe signs the raw request body, so the webhook must not be parsed as JSON
	app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }))
	app.use(express.json({ limit: '100kb' }))
	if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'))

	app.use('/api', apiRoutes({ authRateLimit }))
	app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '7d' }))

	app.use(notFoundHandler)
	app.use(errorHandler)
	return app
}
