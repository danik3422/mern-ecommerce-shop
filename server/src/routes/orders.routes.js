import { Router } from 'express'
import * as orders from '../controllers/orders.controller.js'
import { optionalAuth, requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../services/activity.js'
import { idParams } from '../validation/common.js'
import { createOrderBody, returnRequestBody, updateOrderStatusBody } from '../validation/order.js'

export const orderRoutes = Router()

// customers and guests (guests pass their email and later their order token)
orderRoutes.post('/', optionalAuth, validate({ body: createOrderBody }), orders.createOrder)
orderRoutes.get('/mine', requireAuth, orders.listMyOrders)

// staff (static paths must come before /:id)
orderRoutes.get('/', requirePermission('orders'), orders.listOrders)
orderRoutes.get('/income', requirePermission('dashboard'), orders.monthlyIncome)
orderRoutes.patch(
	'/:id/status',
	requirePermission('orders'),
	validate({ params: idParams, body: updateOrderStatusBody }),
	audit('order.status', (req) => ({
		kind: 'order',
		id: req.valid.params.id,
		label: `#${req.valid.params.id.slice(-8).toUpperCase()}`,
		details: req.valid.body.status,
	})),
	orders.updateOrderStatus,
)

// the customer, a guest with the X-Order-Token header, or staff with the "orders" permission
orderRoutes.get('/:id', optionalAuth, validate({ params: idParams }), orders.getOrder)
orderRoutes.post('/:id/pay', optionalAuth, validate({ params: idParams }), orders.payOrder)
orderRoutes.post('/:id/cancel', optionalAuth, validate({ params: idParams }), orders.cancelMyOrder)
orderRoutes.post(
	'/:id/return',
	optionalAuth,
	validate({ params: idParams, body: returnRequestBody }),
	orders.createReturn,
)
