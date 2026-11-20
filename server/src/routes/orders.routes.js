import { Router } from 'express'
import * as orders from '../controllers/orders.controller.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import { createOrderBody, updateOrderStatusBody } from '../validation/order.js'

export const orderRoutes = Router()

// signed-in user
orderRoutes.post('/', requireAuth, validate({ body: createOrderBody }), orders.createOrder)
orderRoutes.get('/mine', requireAuth, orders.listMyOrders)

// admin (static paths must come before /:id)
orderRoutes.get('/', requireAdmin, orders.listOrders)
orderRoutes.get('/income', requireAdmin, orders.monthlyIncome)
orderRoutes.patch(
	'/:id/status',
	requireAdmin,
	validate({ params: idParams, body: updateOrderStatusBody }),
	orders.updateOrderStatus,
)

// owner (or admin for reading)
orderRoutes.get('/:id', requireAuth, validate({ params: idParams }), orders.getOrder)
orderRoutes.post('/:id/pay', requireAuth, validate({ params: idParams }), orders.payOrder)
orderRoutes.post('/:id/cancel', requireAuth, validate({ params: idParams }), orders.cancelMyOrder)
