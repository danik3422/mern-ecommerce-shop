import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { resolveLineItems } from '../services/lineItems.js'
import { transitionOrder, transitionOrderOrThrow } from '../services/orderStatus.js'
import {
	createCheckoutSession,
	expireCheckoutSession,
	isPaymentsEnabled,
} from '../services/payments.js'
import { calculateTotals } from '../services/pricing.js'
import { findUsablePromo, redeemPromo, releasePromo } from '../services/promoCodes.js'
import { releaseStock, reserveStock } from '../services/stock.js'
import { HttpError, conflict, notFound } from '../utils/HttpError.js'

const paymentUnavailable = () =>
	new HttpError(502, 'The payment provider is not available right now. Please try again.')

/** Customers only see their own orders; admins see all of them. */
const ownerFilter = (user) => (user.isAdmin ? {} : { user: user.id })

/** Opens a Stripe Checkout Session for the order and remembers it. @returns the payment page URL */
const startCheckout = async (order) => {
	const session = await createCheckoutSession(order)
	order.payment = { provider: 'stripe', sessionId: session.id }
	await order.save()
	return session.url
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
			order = await Order.create({ user: req.user.id, items: orderItems, ...totals, address })
		} catch (err) {
			if (promo) await releasePromo(promo.code)
			throw err
		}
	} catch (err) {
		await releaseStock(resolved)
		throw err
	}
	await Cart.deleteOne({ user: req.user.id })

	let checkoutUrl = null
	if (isPaymentsEnabled()) {
		try {
			checkoutUrl = await startCheckout(order)
		} catch (err) {
			console.error('Could not create a checkout session:', err)
			await transitionOrder(order._id, 'cancelled')
			throw paymentUnavailable()
		}
	}

	res.status(201).json({ order, checkoutUrl })
}

export const listMyOrders = async (req, res) => {
	const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean()
	res.json(orders)
}

/** GET /orders/:id — the owner or an admin; others get 404 so ids cannot be probed. */
export const getOrder = async (req, res) => {
	const order = await Order.findOne({ _id: req.valid.params.id, ...ownerFilter(req.user) }).lean()
	if (!order) throw notFound('Order')
	res.json(order)
}

/** POST /orders/:id/pay — a new payment page for a pending order (e.g. after cancelling payment). */
export const payOrder = async (req, res) => {
	if (!isPaymentsEnabled()) throw conflict('Online payment is not available')

	const order = await Order.findOne({ _id: req.valid.params.id, user: req.user.id })
	if (!order) throw notFound('Order')
	if (order.status !== 'pending') throw conflict(`A ${order.status} order cannot be paid`)

	await expireCheckoutSession(order.payment?.sessionId)
	try {
		res.json({ checkoutUrl: await startCheckout(order) })
	} catch (err) {
		console.error('Could not create a checkout session:', err)
		throw paymentUnavailable()
	}
}

/** POST /orders/:id/cancel — customers can cancel unpaid orders; stock is returned. */
export const cancelMyOrder = async (req, res) => {
	const order = await transitionOrderOrThrow(req.valid.params.id, 'cancelled', {
		from: ['pending'],
		filter: { user: req.user.id },
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
	const set = status === 'paid' ? { 'payment.paidAt': new Date() } : {}
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
