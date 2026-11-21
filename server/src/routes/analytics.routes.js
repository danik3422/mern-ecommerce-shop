import { Router } from 'express'
import { analytics } from '../controllers/analytics.controller.js'
import { requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { analyticsQuery } from '../validation/analytics.js'

/** Mounted at /api/admin/analytics — sales analytics, for staff with the analytics permission. */
export const analyticsRoutes = Router()

analyticsRoutes.use(requirePermission('analytics'))

analyticsRoutes.get('/', validate({ query: analyticsQuery }), analytics)
