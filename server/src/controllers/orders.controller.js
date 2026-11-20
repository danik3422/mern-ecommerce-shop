import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { resolveLineItems } from '../services/lineItems.js'
import { createOrderToken, findAccessibleOrder, readOrderToken } from '../services/orderAccess.js'
import { sendOrderEmail } from '../services/orderEmails.js'
import { decideReturn, requestReturn } from '../services/returns.js'
import { transitionOrder, transitionOrderOrThrow } from '../services/orderStatus.js'
import {
	createCheckoutSession,
	expireCheckoutSession,
	isPaymentsEnabled,
} from '../services/payments.js'
import { calculateTotals } from '../services/pricing.js'
import { findUsablePromo, redeemPromo, releasePromo } from '../services/promoCodes.js'
import { releaseStock, reserveStock } from '../services/stock.js'
import { HttpError, badRequest, conflict } from '../utils/HttpError.js'

const paymentUnavailable = () =>
	new HttpError(502, 'The payment provider is not available right now. Please try again.')

/** Opens a Stripe Checkout Session for the order and remembers it. @returns the payment page URL */
const startCheckout = async (order, accessToken) => {
	const session = await createCheckoutSession(order, { accessToken })
	order.payment = { provider: 'stripe', sessionId: session.id }
	await order.save()
	return session.url
}

/**
 * Who the order belongs to: the signed-in customer, or a guest identified by email
 * who gets a secret token for the order.
 */
const orderCustomer = async (req) => {
	if (req.user) {
		const user = await User.findById(req.user.id).lean()
		return { user: req.user.id, email: user.email }
	}
	if (!req.valid.body.email) {
		throw badRequest('Please enter your email', [{ path: 'email', message: 'Required' }])
	}
	return { email: req.valid.body.email, accessToken: createOrderToken() }
}

/** Order lines with a snapshot of the product as it is sold now. */
export const toOrderItems = (resolved) =>
	resolved.map(({ product, variant, ...item }) => ({
		...item,
		title: product.title,
		brand: product.brand,
		image: variant.images[0],
		price: product.price,
	}))

/**
 * POST /orders — prices come from the database, stock is reserved atomically,
 * and the saved cart is cleared. With Stripe configured the response contains
 * the URL of the payment page; otherwise the order stays pending ("pay later").
 */
export const createOrder = async (req, res) => {
	const { items, address, shippingMethod, promoCode } = req.valid.body
	const customer = await orderCustomer(req)
	const resolved = await resolveLineItems(items, { requireStock: true })
	const orderItems = toOrderItems(resolved)
	const promo = promoCode
		? await findUsablePromo(promoCode, calculateTotals(orderItems).subtotal)
		: undefined
	const totals = calculateTotals(orderItems, { shippingMethod, promo })

	await reserveStock(resolved)
	let order
	try {
		if (promo) await redeemPromo(promo)
		try {
			order = await Order.create({ ...customer, items: orderItems, ...totals, address })
		} catch (err) {
			if (promo) await releasePromo(promo.code)
			throw err
		}
	} catch (err) {
		await releaseStock(resolved)
		throw err
	}
	if (req.user) await Cart.deleteOne({ user: req.user.id })
	await sendOrderEmail(order, 'placed')

	let checkoutUrl = null
	if (isPaymentsEnabled()) {
		try {
			checkoutUrl = await startCheckout(order, customer.accessToken)
		} catch (err) {
			console.error('Could not create a checkout session:', err)
			await transitionOrder(order._id, 'cancelled')
			throw paymentUnavailable()
		}
	}

	// the guest token is returned once; the order JSON never contains it
	const { accessToken, ...publicOrder } = order.toObject()
	res.status(201).json({ order: publicOrder, checkoutUrl, ...(accessToken && { accessToken }) })
}

export const listMyOrders = async (req, res) => {
	const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean()
	res.json(orders)
}

/** GET /orders/:id — the customer, an admin or a guest with the order token; others get 404. */
export const getOrder = async (req, res) => {
	const order = await findAccessibleOrder(req, req.valid.params.id)
	const { accessToken: _token, ...publicOrder } = order.toObject()
	res.json(publicOrder)
}

/** POST /orders/:id/pay — a new payment page for a pending order (e.g. after cancelling payment). */
export const payOrder = async (req, res) => {
	if (!isPaymentsEnabled()) throw conflict('Online payment is not available')

	const order = await findAccessibleOrder(req, req.valid.params.id)
	if (order.status !== 'pending') throw conflict(`A ${order.status} order cannot be paid`)

	await expireCheckoutSession(order.payment?.sessionId)
	try {
		res.json({ checkoutUrl: await startCheckout(order, readOrderToken(req)) })
	} catch (err) {
		console.error('Could not create a checkout session:', err)
		throw paymentUnavailable()
	}
}

/** POST /orders/:id/cancel — customers and guests can cancel unpaid orders; stock is returned. */
export const cancelMyOrder = async (req, res) => {
	await findAccessibleOrder(req, req.valid.params.id)
	const order = await transitionOrderOrThrow(req.valid.params.id, 'cancelled', {
		from: ['pending'],
	})
	res.json(order)
}

export const listOrders = async (_req, res) => {
	const orders = await Order.find().sort({ createdAt: -1 }).lean()
	res.json(orders)
}

/** PATCH /orders/:id/status — admins move orders forward; cancelling returns stock. */
export const updateOrderStatus = async (req, res) => {
	const { status } = req.valid.body
	const now = new Date()
	const set = {
		paid: { 'payment.paidAt': now },
		shipped: { shippedAt: now },
		delivered: { deliveredAt: now },
	}[status]
	res.json(await transitionOrderOrThrow(req.valid.params.id, status, { set }))
}

/** GET /orders/income — revenue per month for the last 12 months (admin dashboard) */
export const monthlyIncome = async (_req, res) => {
	const since = new Date()
	since.setMonth(since.getMonth() - 12)

	const income = await Order.aggregate([
		{ $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
		{
			$group: {
				_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
				total: { $sum: '$amount' },
			},
		},
		{ $sort: { '_id.year': 1, '_id.month': 1 } },
	])
	res.json(income)
}

/** POST /orders/:id/return — the customer (or guest with the token) returns delivered items. */
export const createReturn = async (req, res) => {
	const order = await findAccessibleOrder(req, req.valid.params.id)
	const updated = await requestReturn(order, req.valid.body)
	const { accessToken: _token, ...publicOrder } = updated.toObject()
	res.status(201).json(publicOrder)
}

/** PATCH /admin/orders/:id/return — approve, reject or refund a return. */
export const updateReturn = async (req, res) => {
	res.json(await decideReturn(req.valid.params.id, req.valid.body))
}
