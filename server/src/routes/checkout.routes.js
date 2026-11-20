import { Router } from 'express'
import { getShopConfig, quote } from '../controllers/checkout.controller.js'
import { validate } from '../middleware/validate.js'
import { quoteBody } from '../validation/order.js'

/** Mounted at /api — public endpoints used by the bag and checkout */
export const checkoutRoutes = Router()

checkoutRoutes.get('/shop/config', getShopConfig)
checkoutRoutes.post('/checkout/quote', validate({ body: quoteBody }), quote)
