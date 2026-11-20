import { Router } from 'express'
import * as orders from '../controllers/orders.controller.js'
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import { createOrderBody, returnRequestBody, updateOrderStatusBody } from '../validation/order.js'

export const orderRoutes = Router()

// customers and guests (guests pass their email and later their order token)
orderRoutes.post('/', optionalAuth, validate({ body: createOrderBody }), orders.createOrder)
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

// the customer, a guest with the X-Order-Token header, or an admin
orderRoutes.get('/:id', optionalAuth, validate({ params: idParams }), orders.getOrder)
orderRoutes.post('/:id/pay', optionalAuth, validate({ params: idParams }), orders.payOrder)
orderRoutes.post('/:id/cancel', optionalAuth, validate({ params: idParams }), orders.cancelMyOrder)
orderRoutes.post(
	'/:id/return',
	optionalAuth,
	validate({ params: idParams, body: returnRequestBody }),
	orders.createReturn,
)
