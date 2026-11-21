import { Router } from 'express'
import * as admin from '../controllers/admin.controller.js'
import { updateReturn } from '../controllers/orders.controller.js'
import * as promoCodes from '../controllers/promoCodes.controller.js'
import * as team from '../controllers/team.controller.js'
import { requireAdmin, requireOwner, requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../services/activity.js'
import { receiveImage } from '../services/uploads.js'
import {
	adminCustomersQuery,
	adminOrdersQuery,
	adminProductsQuery,
	adminReviewsQuery,
	bulkProductsBody,
	orderNoteBody,
	updateCustomerBody,
} from '../validation/admin.js'
import { idParams } from '../validation/common.js'
import { returnDecisionBody } from '../validation/order.js'
import { createPromoCodeBody, updatePromoCodeBody } from '../validation/promoCode.js'
import { createStaffBody, resetPasswordBody, updateStaffBody } from '../validation/team.js'

const pageQuery = adminReviewsQuery

/**
 * Mounted at /api/admin — staff only; each area needs its permission (services/permissions.js).
 * Changes are recorded in the activity log by `audit`.
 */
export const adminRoutes = Router()

adminRoutes.use(requireAdmin)

const can = requirePermission
const orderLabel = (id) => `#${String(id).slice(-8).toUpperCase()}`

// sidebar numbers: any staff member
adminRoutes.get('/counts', admin.getCounts)

adminRoutes.get('/stats', can('dashboard'), admin.getStats)

// products — static paths before /products/:id
adminRoutes.get(
	'/products',
	can('products'),
	validate({ query: adminProductsQuery }),
	admin.listProducts,
)
adminRoutes.get('/products/filters', can('products'), admin.productFilters)
adminRoutes.post(
	'/products/bulk',
	can('products'),
	validate({ body: bulkProductsBody }),
	audit('product.bulk', (req, body) => ({
		kind: 'product',
		label: `${body.matched ?? req.valid.body.ids.length} products`,
		details:
			req.valid.body.action === 'discount'
				? `discount ${req.valid.body.percent}%`
				: req.valid.body.action,
	})),
	admin.bulkProducts,
)
adminRoutes.get('/products/:id', can('products'), validate({ params: idParams }), admin.getProduct)
adminRoutes.post(
	'/products/:id/duplicate',
	can('products'),
	validate({ params: idParams }),
	audit('product.duplicate', (_req, body) => ({
		kind: 'product',
		id: body._id,
		label: body.title,
	})),
	admin.duplicateProduct,
)
adminRoutes.post('/uploads', can('products'), receiveImage, admin.uploadImage)

// orders and returns
adminRoutes.get('/orders', can('orders'), validate({ query: adminOrdersQuery }), admin.listOrders)
adminRoutes.get('/orders/:id', can('orders'), validate({ params: idParams }), admin.getOrder)
adminRoutes.patch(
	'/orders/:id/note',
	can('orders'),
	validate({ params: idParams, body: orderNoteBody }),
	audit('order.note', (req) => ({
		kind: 'order',
		id: req.valid.params.id,
		label: orderLabel(req.valid.params.id),
	})),
	admin.updateOrderNote,
)
adminRoutes.patch(
	'/orders/:id/return',
	can('returns'),
	validate({ params: idParams, body: returnDecisionBody }),
	audit('order.return', (req) => ({
		kind: 'order',
		id: req.valid.params.id,
		label: orderLabel(req.valid.params.id),
		details: req.valid.body.status,
	})),
	updateReturn,
)

// customers (shoppers only; staff accounts are under /team)
adminRoutes.get(
	'/customers',
	can('customers'),
	validate({ query: adminCustomersQuery }),
	admin.listCustomers,
)
adminRoutes.get(
	'/customers/:id',
	can('customers'),
	validate({ params: idParams }),
	admin.getCustomer,
)
adminRoutes.patch(
	'/customers/:id',
	can('customers'),
	validate({ params: idParams, body: updateCustomerBody }),
	audit('customer.update', (req, body) => ({
		kind: 'customer',
		id: req.valid.params.id,
		label: body.username,
		details: req.valid.body.blocked ? 'blocked' : 'unblocked',
	})),
	admin.updateCustomer,
)

adminRoutes.get(
	'/reviews',
	can('reviews'),
	validate({ query: adminReviewsQuery }),
	admin.listReviews,
)

// promo codes
const promoTarget = (req, body) => ({ kind: 'promoCode', id: body._id, label: body.code })
adminRoutes.get('/promo-codes', can('promoCodes'), promoCodes.listPromoCodes)
adminRoutes.post(
	'/promo-codes',
	can('promoCodes'),
	validate({ body: createPromoCodeBody }),
	audit('promoCode.create', promoTarget),
	promoCodes.createPromoCode,
)
adminRoutes.patch(
	'/promo-codes/:id',
	can('promoCodes'),
	validate({ params: idParams, body: updatePromoCodeBody }),
	audit('promoCode.update', promoTarget),
	promoCodes.updatePromoCode,
)
adminRoutes.delete(
	'/promo-codes/:id',
	can('promoCodes'),
	validate({ params: idParams }),
	audit('promoCode.delete', (req) => ({ kind: 'promoCode', id: req.valid.params.id })),
	promoCodes.deletePromoCode,
)

// team (staff accounts)
const staffTarget = (_req, body) => ({ kind: 'staff', id: body._id, label: body.username })
adminRoutes.get('/team', can('team'), team.listStaff)
adminRoutes.post(
	'/team',
	can('team'),
	validate({ body: createStaffBody }),
	audit('staff.create', staffTarget),
	team.createStaff,
)
adminRoutes.patch(
	'/team/:id',
	can('team'),
	validate({ params: idParams, body: updateStaffBody }),
	audit('staff.update', (req, body) => ({
		...staffTarget(req, body),
		details: Object.keys(req.valid.body).join(', '),
	})),
	team.updateStaff,
)
adminRoutes.post(
	'/team/:id/password',
	can('team'),
	validate({ params: idParams, body: resetPasswordBody }),
	audit('staff.password', staffTarget),
	team.resetPassword,
)
adminRoutes.delete(
	'/team/:id',
	can('team'),
	validate({ params: idParams }),
	audit('staff.delete', (req, _body, locals) => ({
		kind: 'staff',
		id: req.valid.params.id,
		label: locals.label,
	})),
	team.deleteStaff,
)

adminRoutes.get('/activity', requireOwner, validate({ query: pageQuery }), team.activity)
