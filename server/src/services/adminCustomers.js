import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import { notFound } from '../utils/HttpError.js'

const roundMoney = (value) => Math.round(value * 100) / 100
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Orders whose money the shop has received (pending ones are unpaid, cancelled ones refunded). */
const PAID_STATUSES = ['paid', 'shipped', 'delivered']

/**
 * $group fields over a customer's orders. Total spent = paid orders minus refunded returns.
 */
const orderTotals = {
	orders: { $sum: 1 },
	totalSpent: {
		$sum: {
			$cond: [
				{ $in: ['$status', PAID_STATUSES] },
				{
					$subtract: [
						'$amount',
						{
							$cond: [
								{ $eq: ['$returnRequest.status', 'refunded'] },
								{ $ifNull: ['$returnRequest.refundAmount', 0] },
								0,
							],
						},
					],
				},
				0,
			],
		},
	},
	lastOrderAt: { $max: '$createdAt' },
}

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	oldest: { createdAt: 1, _id: 1 },
	spent: { totalSpent: -1, createdAt: -1, _id: -1 },
}

// staff accounts are managed under Team and never listed as customers
const CUSTOMER = { role: 'customer' }

const STATUS_FILTERS = {
	active: { blocked: { $ne: true } },
	blocked: { blocked: true },
}

/** Paginated shoppers with their order count and total spent: `{ items, page, pages, total }` */
export const listCustomers = async ({ q, status, sort, page, limit }) => {
	const filter = { ...CUSTOMER, ...STATUS_FILTERS[status] }
	if (q) {
		const pattern = new RegExp(escapeRegex(q), 'i')
		filter.$or = [{ username: pattern }, { email: pattern }]
	}

	const [result] = await User.aggregate([
		{ $match: filter },
		{
			$lookup: {
				from: Order.collection.name,
				localField: '_id',
				foreignField: 'user',
				pipeline: [{ $group: { _id: null, ...orderTotals } }],
				as: 'stats',
			},
		},
		{
			$addFields: {
				orders: { $ifNull: [{ $first: '$stats.orders' }, 0] },
				totalSpent: { $ifNull: [{ $first: '$stats.totalSpent' }, 0] },
				lastOrderAt: { $first: '$stats.lastOrderAt' },
			},
		},
		{
			$facet: {
				items: [
					{ $sort: SORTS[sort] },
					{ $skip: (page - 1) * limit },
					{ $limit: limit },
					{ $project: { stats: 0, passwordHash: 0, addresses: 0, wishlist: 0 } },
				],
				total: [{ $count: 'count' }],
			},
		},
	])

	const total = result.total[0]?.count ?? 0
	const items = result.items.map((user) => ({ ...user, totalSpent: roundMoney(user.totalSpent) }))
	return { items, page, pages: Math.ceil(total / limit), total }
}

const RECENT_ORDERS = 50

/** Profile, address book, recent orders and totals of one account. */
export const getCustomer = async (id) => {
	const user = await User.findOne({ _id: id, ...CUSTOMER }).lean()
	if (!user) throw notFound('Customer')

	const userId = new mongoose.Types.ObjectId(id)
	const [orders, [stats], reviews] = await Promise.all([
		Order.find({ user: userId })
			.sort({ createdAt: -1, _id: -1 })
			.limit(RECENT_ORDERS)
			.select('status amount items.quantity createdAt returnRequest.status')
			.lean(),
		Order.aggregate([{ $match: { user: userId } }, { $group: { _id: null, ...orderTotals } }]),
		Review.countDocuments({ user: userId }),
	])

	const { wishlist, passwordHash: _hash, ...profile } = user
	return {
		...profile,
		wishlistCount: wishlist?.length ?? 0,
		reviews,
		orders: orders.map(({ items, ...order }) => ({
			...order,
			itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
		})),
		stats: {
			orders: stats?.orders ?? 0,
			totalSpent: roundMoney(stats?.totalSpent ?? 0),
			lastOrderAt: stats?.lastOrderAt ?? null,
		},
	}
}

/** Blocks or unblocks a shopper (`{ blocked }`); staff accounts are changed under Team. */
export const updateCustomer = async (id, { blocked }) => {
	const user = await User.findOneAndUpdate(
		{ _id: id, ...CUSTOMER },
		{ $set: { blocked } },
		{ returnDocument: 'after' },
	)
	if (!user) throw notFound('Customer')
	return user
}
