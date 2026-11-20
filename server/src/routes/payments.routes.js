import { Router } from 'express'

/** Mounted at /api/payments — Stripe webhook (raw body is prepared in app.js). */
export const paymentRoutes = Router()
