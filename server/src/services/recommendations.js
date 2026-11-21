import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'

/** A pair must share at least this many orders to count as "frequently bought together". */
export const MIN_SHARED_ORDERS = 2

/** Active products with at least one size in stock. */
const AVAILABLE = { active: true, 'variants.sizes.stock': { $gt: 0 } }

/**
 * Products bought in the same orders as this one (cancelled orders do not count),
 * most shared orders first: `[{ productId, orders }]`.
 */
export const coPurchases = (productId) => {
	const id = new mongoose.Types.ObjectId(String(productId))
	return Order.aggregate([
		{ $match: { status: { $ne: 'cancelled' }, 'items.productId': id } },
		// one entry per product and order, however many sizes or colors were bought
		{ $project: { products: { $setUnion: ['$items.productId', []] } } },
		{ $unwind: '$products' },
		{ $match: { products: { $ne: id } } },
		{ $group: { _id: '$products', orders: { $sum: 1 } } },
		{ $match: { orders: { $gte: MIN_SHARED_ORDERS } } },
		{ $sort: { orders: -1, _id: 1 } },
		{ $project: { _id: 0, productId: '$_id', orders: 1 } },
	])
}

/** Available products sharing a category or the brand, best rated first. */
const similarProducts = (product, limit) =>
	Product.find({
		...AVAILABLE,
		_id: { $ne: product._id },
		$or: [{ categories: { $in: product.categories ?? [] } }, { brand: product.brand }],
	})
		.sort({ 'rating.average': -1, 'rating.count': -1, createdAt: -1, _id: 1 })
		.limit(limit)
		.lean()

/**
 * What to show next to a product.
 * @returns `{ source: 'orders', items }` — products often bought with it (each with `orders`,
 *   the number of shared orders), or `{ source: 'related', items }` — similar products, when
 *   there are not enough orders yet
 */
export const boughtTogether = async (product, limit = 4) => {
	const pairs = await coPurchases(product._id)
	if (pairs.length) {
		const products = await Product.find({
			...AVAILABLE,
			_id: { $in: pairs.map((pair) => pair.productId) },
		}).lean()
		const byId = new Map(products.map((item) => [String(item._id), item]))
		const items = pairs
			.map((pair) => {
				const item = byId.get(String(pair.productId))
				return item && { ...item, orders: pair.orders }
			})
			.filter(Boolean)
			.slice(0, limit)
		if (items.length) return { source: 'orders', items }
	}
	return { source: 'related', items: await similarProducts(product, limit) }
}
