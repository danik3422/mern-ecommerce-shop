import { Router } from 'express'
import * as cart from '../controllers/cart.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { replaceCartBody } from '../validation/cart.js'

// All routes work with the cart of the signed-in user
export const cartRoutes = Router()

cartRoutes.use(requireAuth)
cartRoutes.get('/', cart.getMyCart)
cartRoutes.put('/', validate({ body: replaceCartBody }), cart.replaceMyCart)
cartRoutes.delete('/', cart.clearMyCart)
