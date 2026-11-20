import { Router } from 'express'
import * as admin from '../controllers/admin.controller.js'
import { updateReturn } from '../controllers/orders.controller.js'
import * as promoCodes from '../controllers/promoCodes.controller.js'
import { requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { receiveImage } from '../services/uploads.js'
import { adminOrdersQuery, adminProductsQuery, adminReviewsQuery } from '../validation/admin.js'
import { idParams } from '../validation/common.js'
import { returnDecisionBody } from '../validation/order.js'
import { createPromoCodeBody, updatePromoCodeBody } from '../validation/promoCode.js'

/** Mounted at /api/admin — dashboard stats, product listing incl. hidden ones, uploads. */
export const adminRoutes = Router()

adminRoutes.use(requireAdmin)

adminRoutes.get('/stats', admin.getStats)
adminRoutes.get('/products', validate({ query: adminProductsQuery }), admin.listProducts)
adminRoutes.get('/products/:id', validate({ params: idParams }), admin.getProduct)
adminRoutes.get('/orders', validate({ query: adminOrdersQuery }), admin.listOrders)
adminRoutes.get('/orders/:id', validate({ params: idParams }), admin.getOrder)
adminRoutes.patch(
	'/orders/:id/return',
	validate({ params: idParams, body: returnDecisionBody }),
	updateReturn,
)
adminRoutes.get('/reviews', validate({ query: adminReviewsQuery }), admin.listReviews)
adminRoutes.post('/uploads', receiveImage, admin.uploadImage)

adminRoutes.get('/promo-codes', promoCodes.listPromoCodes)
adminRoutes.post(
	'/promo-codes',
	validate({ body: createPromoCodeBody }),
	promoCodes.createPromoCode,
)
adminRoutes.patch(
	'/promo-codes/:id',
	validate({ params: idParams, body: updatePromoCodeBody }),
	promoCodes.updatePromoCode,
)
adminRoutes.delete('/promo-codes/:id', validate({ params: idParams }), promoCodes.deletePromoCode)
