import mongoose from 'mongoose'
import { ORDER_STATUSES, Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import { LOW_STOCK_THRESHOLD, toProductView } from '../services/productView.js'
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

/** Sizes of active products that are low or out of stock, lowest first. */
const lowStockSizes = () =>
	Product.aggregate([
		{ $match: { active: true } },
		{ $unwind: '$sizes' },
		{ $match: { 'sizes.stock': { $lte: LOW_STOCK_THRESHOLD } } },
		{ $sort: { 'sizes.stock': 1, title: 1 } },
		{ $limit: 10 },
		{
			$project: {
				_id: 0,
				productId: '$_id',
				title: 1,
				slug: 1,
				size: '$sizes.label',
				stock: '$sizes.stock',
			},
		},
	])

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
		User.countDocuments({ isAdmin: false }),
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

/** GET /admin/products — like the public list, but includes hidden products. */
export const listProducts = async (req, res) => {
	const { q, status, lowStock, page, limit } = req.valid.query
	const filter = {}
	if (q) {
		const pattern = containsIgnoringCase(q)
		filter.$or = [{ title: pattern }, { brand: pattern }, { slug: pattern }]
	}
	if (status) filter.active = status === 'active'
	if (lowStock) filter.sizes = { $elemMatch: { stock: { $lte: LOW_STOCK_THRESHOLD } } }

	const result = await paginate(Product, filter, { page, limit, sort: { createdAt: -1, _id: -1 } })
	res.json({ ...result, items: result.items.map(toProductView) })
}

/** GET /admin/products/:id — also hidden products. */
export const getProduct = async (req, res) => {
	const product = await Product.findById(req.valid.params.id).lean()
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

/** GET /admin/orders — filter by status, search by order id or customer username/email. */
export const listOrders = async (req, res) => {
	const { status, q, page, limit } = req.valid.query
	const filter = {}
	if (status) filter.status = status
	if (q) {
		const pattern = containsIgnoringCase(q)
		const customers = await User.find({ $or: [{ username: pattern }, { email: pattern }] })
			.select('_id')
			.lean()
		filter.$or = [{ user: { $in: customers.map((customer) => customer._id) } }]
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

/** GET /admin/orders/:id — with the customer's username and email. */
export const getOrder = async (req, res) => {
	const order = await Order.findById(req.valid.params.id).populate('user', 'username email').lean()
	if (!order) throw notFound('Order')
	res.json(order)
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
