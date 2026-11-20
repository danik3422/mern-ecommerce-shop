import { Router } from 'express'

/**
 * Mounted at /api/products/:productId/reviews (owner: reviews & account workstream).
 * mergeParams gives access to :productId.
 */
export const reviewRoutes = Router({ mergeParams: true })
