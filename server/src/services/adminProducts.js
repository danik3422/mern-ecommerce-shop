import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { conflict, notFound } from '../utils/HttpError.js'
import { toProductView } from './productView.js'
import { getShopSettings } from './shopSettings.js'
import { notifyRestocked } from './stockAlerts.js'

const roundMoney = (value) => Math.round(value * 100) / 100
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isOnSale = { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, '$price'] }

// pieces in stock over all colors and sizes
const totalStock = {
	$sum: { $map: { input: '$variants', as: 'variant', in: { $sum: '$$variant.sizes.stock' } } },
}

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	oldest: { createdAt: 1, _id: 1 },
	title_asc: { title: 1, _id: 1 },
	title_desc: { title: -1, _id: 1 },
	price_asc: { price: 1, _id: 1 },
	price_desc: { price: -1, _id: 1 },
	stock_asc: { totalStock: 1, _id: 1 },
	stock_desc: { totalStock: -1, _id: 1 },
}

/** Mongo filter for the admin product list (hidden products included). */
const productFilter = (
	{ q, status, category, brand, onSale, stock, lowStock },
	lowStockThreshold,
) => {
	const filter = {}
	if (q) {
		const pattern = new RegExp(escapeRegex(q), 'i')
		filter.$or = [{ title: pattern }, { brand: pattern }, { slug: pattern }]
	}
	if (status) filter.active = status === 'active'
	if (category) filter.categories = category
	if (brand) filter.brand = brand
	if (onSale !== undefined) filter.$expr = onSale ? isOnSale : { $not: [isOnSale] }
	if (stock === 'low' || lowStock) {
		filter['variants.sizes.stock'] = { $lte: lowStockThreshold }
	}
	// sold out: no size of any color has stock left
	if (stock === 'out') filter['variants.sizes.stock'] = { $not: { $gt: 0 } }
	return filter
}

/** Paginated admin product list: `{ items, page, pages, total }` */
export const listAdminProducts = async ({ sort, page, limit, ...filters }) => {
	const { lowStockThreshold } = await getShopSettings()
	const [result] = await Product.aggregate(
		[
			{ $match: productFilter(filters, lowStockThreshold) },
			{ $addFields: { totalStock } },
			{
				$facet: {
					items: [
						{ $sort: SORTS[sort] },
						{ $skip: (page - 1) * limit },
						{ $limit: limit },
						{ $project: { totalStock: 0 } },
					],
					total: [{ $count: 'count' }],
				},
			},
		],
		// case-insensitive sorting by title
		{ collation: { locale: 'en', strength: 2 } },
	)
	const total = result.total[0]?.count ?? 0
	return { items: result.items.map(toProductView), page, pages: Math.ceil(total / limit), total }
}

/** Brands and categories in use, for the filter dropdowns. */
export const productFilterOptions = async () => {
	const [brands, categories] = await Promise.all([
		Product.distinct('brand'),
		Product.distinct('categories'),
	])
	const byName = (a, b) => a.localeCompare(b)
	return { brands: brands.sort(byName), categories: categories.sort(byName) }
}

/** "tee" → the first of "tee-copy", "tee-copy-2", ... that is not taken yet */
const freeCopySlug = async (slug) => {
	const base = `${slug.replace(/-copy(?:-\d+)?$/, '')}-copy`
	const taken = new Set(
		await Product.distinct('slug', { slug: new RegExp(`^${escapeRegex(base)}(?:-\\d+)?$`) }),
	)
	let candidate = base
	for (let n = 2; taken.has(candidate); n++) candidate = `${base}-${n}`
	return candidate
}

/**
 * Copies a product with a "(copy)" title and a free slug. The copy is hidden, so it can be
 * edited before customers see it, and starts without reviews.
 */
export const duplicateProduct = async (id) => {
	const original = await Product.findById(id).lean()
	if (!original) throw notFound('Product')

	const { _id, createdAt: _created, updatedAt: _updated, rating: _rating, ...fields } = original
	// two copies made at the same moment can still pick the same slug; retry once
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const copy = await Product.create({
				...fields,
				title: `${original.title} (copy)`,
				slug: await freeCopySlug(original.slug),
				active: false,
			})
			return toProductView(copy)
		} catch (err) {
			if (err.code !== 11000 || attempt === 1) throw err
		}
	}
	throw conflict('Could not find a free URL slug for the copy')
}

/**
 * New prices for a discount of `percent` off the regular price.
 * The regular price is the compare-at price while on sale, otherwise the price, so repeating
 * a discount never compounds. 0% (or a discount too small to change the price) ends the sale.
 * @returns `{ price, compareAtPrice }` — compareAtPrice null removes it; null when nothing changes
 */
export const discountedPrices = (product, percent) => {
	const onSale = product.compareAtPrice > product.price
	const regular = onSale ? product.compareAtPrice : product.price
	const price = roundMoney(regular * (1 - percent / 100))

	if (percent > 0 && price < regular && price > 0) {
		const unchanged = onSale && price === product.price
		return unchanged ? null : { price, compareAtPrice: regular }
	}
	return onSale ? { price: regular, compareAtPrice: null } : null
}

const pricesUpdate = ({ price, compareAtPrice }) =>
	compareAtPrice === null
		? { $set: { price }, $unset: { compareAtPrice: 1 } }
		: { $set: { price, compareAtPrice } }

/**
 * Applies one action to many products.
 * @returns `{ matched, modified }` — products found and products actually changed
 */
export const bulkUpdateProducts = async ({ ids, action, percent }) => {
	const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id))
	const filter = { _id: { $in: objectIds } }

	if (action === 'delete') {
		const { deletedCount } = await Product.deleteMany(filter)
		return { matched: deletedCount, modified: deletedCount }
	}

	if (action === 'show' || action === 'hide') {
		const active = action === 'show'
		const [matched, { modifiedCount }] = await Promise.all([
			Product.countDocuments(filter),
			Product.updateMany({ ...filter, active: { $ne: active } }, { $set: { active } }),
		])
		// customers waiting for a size of a product that just became visible
		if (active && modifiedCount) await notifyRestocked(ids)
		return { matched, modified: modifiedCount }
	}

	const products = await Product.find(filter).select('price compareAtPrice').lean()
	const updates = products
		.map((product) => [product._id, discountedPrices(product, percent)])
		.filter(([, prices]) => prices)
		.map(([_id, prices]) => ({ updateOne: { filter: { _id }, update: pricesUpdate(prices) } }))
	if (updates.length) await Product.bulkWrite(updates)
	return { matched: products.length, modified: updates.length }
}
