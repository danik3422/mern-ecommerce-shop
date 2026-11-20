import { Router } from 'express'
import { health } from '../controllers/health.controller.js'
import { accountRoutes } from './account.routes.js'
import { adminRoutes } from './admin.routes.js'
import { authRoutes } from './auth.routes.js'
import { cartRoutes } from './cart.routes.js'
import { orderRoutes } from './orders.routes.js'
import { paymentRoutes } from './payments.routes.js'
import { productRoutes } from './products.routes.js'
import { reviewRoutes } from './reviews.routes.js'
import { userRoutes } from './users.routes.js'

export const apiRoutes = ({ authRateLimit }) => {
	const router = Router()

	router.get('/health', health)
	router.use('/auth', authRoutes({ rateLimit: authRateLimit }))
	router.use('/products/:productId/reviews', reviewRoutes)
	router.use('/products', productRoutes)
	router.use('/cart', cartRoutes)
	router.use('/orders', orderRoutes)
	router.use('/payments', paymentRoutes)
	router.use('/account', accountRoutes)
	router.use('/users', userRoutes)
	router.use('/admin', adminRoutes)

	return router
}
