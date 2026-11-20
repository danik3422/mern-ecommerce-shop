import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { createStockAlert } from '../controllers/stockAlerts.controller.js'
import { optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { stockAlertBody, stockAlertParams } from '../validation/stockAlert.js'

/** Mounted at /api/products/:productId/stock-alerts */
export const stockAlertRoutes = Router({ mergeParams: true })

// public form that triggers emails: keep it from being abused
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { message: 'Too many requests, please try again later' },
})

stockAlertRoutes.post(
	'/',
	limiter,
	optionalAuth,
	validate({ params: stockAlertParams, body: stockAlertBody }),
	createStockAlert,
)
