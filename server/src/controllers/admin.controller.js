import mongoose from 'mongoose'
import { ORDER_STATUSES, Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import * as customers from '../services/adminCustomers.js'
import * as products from '../services/adminProducts.js'
import { toProductView } from '../services/productView.js'
import { getShopSettings } from '../services/shopSettings.js'
import { saveImage } from '../services/uploads.js'
import { notFound } from '../utils/HttpError.js'

const REVENUE_DAYS = 30
const NOT_CANCELLED = { status: { $ne: 'cancelled' } }

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const containsIgnoringCase = (text) => new RegExp(escapeRegex(text), 'i')
const roundMoney = (value) => Math.round(value * 100) / 100

/** Runs a paginated find: `{ items, page, pages, total }` */
const paginate = async (model, filter, { page, limit, sort, populate }) => {
	let query = model
		.find(filter)
		.sort(sort)
		.skip((page - 1) * limit)
		.limit(limit)
	if (populate) query = query.populate(...populate)

	const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)])
	return { items, page, pages: Math.ceil(total / limit), total }
}

/** Dates as YYYY-MM-DD (UTC) for the last `days` days, oldest first. */
const lastDays = (days) => {
	const today = new Date()
	return Array.from({ length: days }, (_, i) => {
		const date = new Date(today)
		date.setUTCDate(today.getUTCDate() - (days - 1 - i))
		return date.toISOString().slice(0, 10)
	})
}

/** Revenue and order count per day; days without orders are included with zeros. */
const revenuePerDay = async () => {
	const days = lastDays(REVENUE_DAYS)
	const rows = await Order.aggregate([
		{ $match: { ...NOT_CANCELLED, createdAt: { $gte: new Date(`${days[0]}T00:00:00Z`) } } },
		{
			$group: {
				_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
				total: { $sum: '$amount' },
				orders: { $sum: 1 },
			},
		},
	])
	const byDay = new Map(rows.map((row) => [row._id, row]))
	return days.map((date) => ({
		date,
		total: roundMoney(byDay.get(date)?.total ?? 0),
		orders: byDay.get(date)?.orders ?? 0,
	}))
}

/** Colors and sizes of active products that are low or out of stock, lowest first. */
const lowStockSizes = async () => {
	const { lowStockThreshold } = await getShopSettings()
	return Product.aggregate([
		{ $match: { active: true } },
		{ $unwind: '$variants' },
		{ $unwind: '$variants.sizes' },
		{ $match: { 'variants.sizes.stock': { $lte: lowStockThreshold } } },
		{ $sort: { 'variants.sizes.stock': 1, title: 1 } },
		{ $limit: 10 },
		{
			$project: {
				_id: 0,
				productId: '$_id',
				title: 1,
				slug: 1,
				color: '$variants.color',
				size: '$variants.sizes.label',
				stock: '$variants.sizes.stock',
			},
		},
	])
}

/** Best sellers by quantity among orders that were not cancelled. */
const topProducts = () =>
	Order.aggregate([
		{ $match: NOT_CANCELLED },
		{ $unwind: '$items' },
		{
			$group: {
				_id: '$items.productId',
				title: { $last: '$items.title' },
				brand: { $last: '$items.brand' },
				quantity: { $sum: '$items.quantity' },
				revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
			},
		},
		{ $sort: { quantity: -1, revenue: -1 } },
		{ $limit: 5 },
		{ $project: { _id: 0, productId: '$_id', title: 1, brand: 1, quantity: 1, revenue: 1 } },
	])

/** GET /admin/stats — everything the dashboard shows, in one request. */
export const getStats = async (_req, res) => {
	const [
		[revenue],
		statusRows,
		customers,
		products,
		activeProducts,
		lowStock,
		perDay,
		top,
		recent,
	] = await Promise.all([
		Order.aggregate([
			{ $match: NOT_CANCELLED },
			{ $group: { _id: null, total: { $sum: '$amount' } } },
		]),
		Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
		User.countDocuments({ role: 'customer' }),
		Product.countDocuments(),
		Product.countDocuments({ active: true }),
		lowStockSizes(),
		revenuePerDay(),
		topProducts(),
		Order.find()
			.sort({ createdAt: -1, _id: -1 })
			.limit(5)
			.populate('user', 'username email')
			.lean(),
	])

	const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]))
	for (const row of statusRows) ordersByStatus[row._id] = row.count

	res.json({
		revenue: roundMoney(revenue?.total ?? 0),
		orders: Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0),
		ordersByStatus,
		customers,
		products: { total: products, active: activeProducts },
		lowStock,
		revenuePerDay: perDay,
		topProducts: top.map((product) => ({ ...product, revenue: roundMoney(product.revenue) })),
		recentOrders: recent,
	})
}

/** GET /admin/products — like the public list, but includes hidden products; more filters and sorts. */
export const listProducts = async (req, res) => {
	res.json(await products.listAdminProducts(req.valid.query))
}

/** GET /admin/products/filters — brands and categories for the filter dropdowns. */
export const productFilters = async (_req, res) => {
	res.json(await products.productFilterOptions())
}

/** POST /admin/products/:id/duplicate — a hidden copy to edit. */
export const duplicateProduct = async (req, res) => {
	res.status(201).json(await products.duplicateProduct(req.valid.params.id))
}

/** POST /admin/products/bulk — show, hide, delete or discount many products at once. */
export const bulkProducts = async (req, res) => {
	res.json(await products.bulkUpdateProducts(req.valid.body))
}

/** GET /admin/products/:id — also hidden products. */
export const getProduct = async (req, res) => {
	const product = await Product.findById(req.valid.params.id).lean()
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

/** Order ids ending with these hex digits, e.g. "#1A2B3C4D" as shown to customers. */
const orderNumberMatch = (q) => {
	const hex = q.replace(/^#/, '')
	if (!/^[a-f\d]{6,24}$/i.test(hex)) return []
	return [
		{ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${hex}$`, options: 'i' } } },
	]
}

/** Start of the day after `day` (YYYY-MM-DD), so "to" includes the whole day. */
const dayAfter = (day) => {
	const date = new Date(`${day}T00:00:00Z`)
	date.setUTCDate(date.getUTCDate() + 1)
	return date
}

/**
 * GET /admin/orders — filter by status, return state and date range;
 * search by order number, customer username/email, guest email or the name on the address.
 */
export const listOrders = async (req, res) => {
	const { status, returnStatus, q, from, to, page, limit } = req.valid.query
	const filter = {}
	if (status) filter.status = status
	if (returnStatus) filter['returnRequest.status'] = returnStatus
	if (from || to) {
		filter.createdAt = {}
		if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00Z`)
		if (to) filter.createdAt.$lt = dayAfter(to)
	}
	if (q) {
		const pattern = containsIgnoringCase(q)
		const customers = await User.find({ $or: [{ username: pattern }, { email: pattern }] })
			.select('_id')
			.lean()
		filter.$or = [
			{ user: { $in: customers.map((customer) => customer._id) } },
			// guest orders are found by the email entered at checkout
			{ email: pattern },
			{ 'address.fullName': pattern },
			...orderNumberMatch(q),
		]
		if (mongoose.isValidObjectId(q)) filter.$or.push({ _id: q })
	}

	res.json(
		await paginate(Order, filter, {
			page,
			limit,
			sort: { createdAt: -1, _id: -1 },
			populate: ['user', 'username email'],
		}),
	)
}

/** GET /admin/orders/:id — with the customer's username and email and the internal note. */
export const getOrder = async (req, res) => {
	const order = await Order.findById(req.valid.params.id)
		.select('+adminNote')
		.populate('user', 'username email')
		.lean()
	if (!order) throw notFound('Order')
	res.json(order)
}

/** PATCH /admin/orders/:id/note — the internal note; an empty note removes it. */
export const updateOrderNote = async (req, res) => {
	const { adminNote } = req.valid.body
	const order = await Order.findByIdAndUpdate(
		req.valid.params.id,
		adminNote ? { $set: { adminNote } } : { $unset: { adminNote: 1 } },
		{ returnDocument: 'after' },
	)
		.select('+adminNote')
		.lean()
	if (!order) throw notFound('Order')
	res.json({ adminNote: order.adminNote ?? '' })
}

/** GET /admin/counts — numbers for the sidebar: orders and returns waiting for the shop. */
export const getCounts = async (_req, res) => {
	const [toShip, unpaid, returns] = await Promise.all([
		Order.countDocuments({ status: 'paid' }),
		Order.countDocuments({ status: 'pending' }),
		Order.countDocuments({ 'returnRequest.status': { $in: ['requested', 'approved'] } }),
	])
	res.json({ ordersToShip: toShip, ordersUnpaid: unpaid, openReturns: returns })
}

/** GET /admin/customers — accounts with order count and total spent. */
export const listCustomers = async (req, res) => {
	res.json(await customers.listCustomers(req.valid.query))
}

/** GET /admin/customers/:id — profile, addresses, orders, totals. */
export const getCustomer = async (req, res) => {
	res.json(await customers.getCustomer(req.valid.params.id))
}

/** PATCH /admin/customers/:id — `{ blocked }` */
export const updateCustomer = async (req, res) => {
	res.json(await customers.updateCustomer(req.valid.params.id, req.valid.body))
}

/** POST /admin/customers/:id/sessions/revoke — signs the customer out on every device */
export const revokeCustomerSessions = async (req, res) => {
	res.json(await customers.revokeCustomerSessions(req.valid.params.id))
}

/** GET /admin/reviews — newest first, with the product they belong to. */
export const listReviews = async (req, res) => {
	const { page, limit } = req.valid.query
	res.json(
		await paginate(
			Review,
			{},
			{
				page,
				limit,
				sort: { createdAt: -1, _id: -1 },
				populate: ['product', 'title slug'],
			},
		),
	)
}

/** POST /admin/uploads — multipart field "image" → `{ url }` */
export const uploadImage = async (req, res) => {
	res.status(201).json({ url: await saveImage(req.file) })
}
