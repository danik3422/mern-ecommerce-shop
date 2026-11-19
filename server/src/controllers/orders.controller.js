import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { resolveLineItems } from '../services/lineItems.js'
import { calculateTotals } from '../services/pricing.js'
import { notFound } from '../utils/HttpError.js'

/**
 * POST /orders — prices are always taken from the database, never from the client.
 * The user's saved cart is cleared after a successful order.
 */
export const createOrder = async (req, res) => {
	const { items, address } = req.valid.body
	const resolved = await resolveLineItems(items, { requireInStock: true })

	const orderItems = resolved.map(({ product, ...item }) => ({
		...item,
		title: product.title,
		price: product.price,
	}))
	const totals = calculateTotals(orderItems)

	const order = await Order.create({ user: req.user.id, items: orderItems, ...totals, address })
	await Cart.deleteOne({ user: req.user.id })

	res.status(201).json(order)
}

export const listMyOrders = async (req, res) => {
	const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).lean()
	res.json(orders)
}

export const listOrders = async (_req, res) => {
	const orders = await Order.find().sort({ createdAt: -1 }).lean()
	res.json(orders)
}

export const updateOrderStatus = async (req, res) => {
	const order = await Order.findByIdAndUpdate(
		req.valid.params.id,
		{ status: req.valid.body.status },
		{ returnDocument: 'after', runValidators: true },
	)
	if (!order) throw notFound('Order')
	res.json(order)
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
