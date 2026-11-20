import { Router } from 'express'
import { stripeWebhook } from '../controllers/payments.controller.js'

/** Mounted at /api/payments — Stripe webhook (raw body is prepared in app.js). */
export const paymentRoutes = Router()

paymentRoutes.post('/webhook', stripeWebhook)
