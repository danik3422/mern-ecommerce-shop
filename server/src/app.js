import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { analyticsRoutes } from './routes/analytics.routes.js'
import { apiRoutes } from './routes/index.js'
import { settingsRoutes } from './routes/settings.routes.js'

/**
 * In production the API also delivers the built storefront (client/dist): one address for the
 * site and the API, so the session cookie is first-party and no CORS setup is needed.
 * Hashed files under /assets are cached for a year, photos for a day; index.html is revalidated.
 */
const serveClient = (app) => {
	const dist = path.resolve(env.CLIENT_DIST)
	if (!env.isProduction || !existsSync(path.join(dist, 'index.html'))) return

	app.use(
		express.static(dist, {
			index: false,
			setHeaders: (res, file) => {
				const inFolder = (name) => file.includes(`${path.sep}${name}${path.sep}`)
				let cache = 'no-cache'
				if (inFolder('assets')) cache = 'public, max-age=31536000, immutable'
				else if (inFolder('images')) cache = 'public, max-age=86400'
				res.setHeader('Cache-Control', cache)
			},
		}),
	)
	// client-side routes (/product/…, /admin/…) get the app; unknown /api and /uploads stay 404
	app.get(/^\/(?!api\/|api$|uploads\/).*/, (_req, res) => {
		res.setHeader('Cache-Control', 'no-cache')
		res.sendFile(path.join(dist, 'index.html'))
	})
}

/** Builds the Express app without starting it, so tests can use it directly. */
export const createApp = ({ authRateLimit = env.AUTH_RATE_LIMIT } = {}) => {
	const app = express()

	app.set('trust proxy', env.TRUST_PROXY)
	app.use(helmet())
	// credentials: the client on another origin may send the refresh cookie to /api/auth
	app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }))
	// Stripe signs the raw request body, so the webhook must not be parsed as JSON
	app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }))
	app.use(express.json({ limit: '100kb' }))
	if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'))

	// before the other /api routes, so the /admin router does not handle it first
	app.use('/api/admin/settings', settingsRoutes)
	app.use('/api/admin/analytics', analyticsRoutes)
	app.use('/api', apiRoutes({ authRateLimit }))
	app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '7d' }))
	serveClient(app)

	app.use(notFoundHandler)
	app.use(errorHandler)
	return app
}
