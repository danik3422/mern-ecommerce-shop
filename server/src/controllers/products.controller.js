import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { toProductView } from '../services/productView.js'
import { notFound } from '../utils/HttpError.js'

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	price_asc: { price: 1, _id: 1 },
	price_desc: { price: -1, _id: 1 },
	rating: { 'rating.average': -1, 'rating.count': -1, _id: 1 },
	discount: { discount: -1, createdAt: -1, _id: 1 },
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Active products, optionally limited to a category and a free-text search. */
const scopeFilter = ({ category, q }) => {
	const filter = { active: true }
	if (category) filter.categories = category
	if (q) {
		const pattern = new RegExp(escapeRegex(q), 'i')
		filter.$or = [{ title: pattern }, { brand: pattern }, { description: pattern }]
	}
	return filter
}

const isOnSale = { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, '$price'] }

const buildFilter = ({
	brand,
	color,
	size,
	minPrice,
	maxPrice,
	onSale,
	inStock,
	ids,
	...scope
}) => {
	const filter = scopeFilter(scope)
	if (brand?.length) filter.brand = { $in: brand }
	if (color?.length) filter.colors = { $in: color }

	// together with "in stock", a size filter means "available in one of these sizes"
	if (size?.length || inStock) {
		const sizeMatch = {}
		if (size?.length) sizeMatch.label = { $in: size }
		if (inStock) sizeMatch.stock = { $gt: 0 }
		filter.sizes = { $elemMatch: sizeMatch }
	}

	if (minPrice !== undefined || maxPrice !== undefined) {
		filter.price = {}
		if (minPrice !== undefined) filter.price.$gte = minPrice
		if (maxPrice !== undefined) filter.price.$lte = maxPrice
	}
	if (onSale) filter.$expr = isOnSale
	// aggregation $match does not cast strings, so ids must be ObjectIds
	if (ids) filter._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }
	return filter
}

// share of the original price taken off; used only for the "discount" sort
const discountShare = {
	$cond: [isOnSale, { $subtract: [1, { $divide: ['$price', '$compareAtPrice'] }] }, 0],
}

/** Finds an active product by Mongo id or by slug. */
export const findActiveProduct = (idOrSlug) =>
	Product.findOne({
		active: true,
		...(mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }),
	}).lean()

/** GET /products — public, paginated: `{ items, page, pages, total }` */
export const listProducts = async (req, res) => {
	const { sort, page, limit, ...filters } = req.valid.query

	const [result] = await Product.aggregate([
		{ $match: buildFilter(filters) },
		{ $addFields: { discount: discountShare } },
		{
			$facet: {
				items: [
					{ $sort: SORTS[sort] },
					{ $skip: (page - 1) * limit },
					{ $limit: limit },
					{ $project: { discount: 0 } },
				],
				total: [{ $count: 'count' }],
			},
		},
	])

	const total = result.total[0]?.count ?? 0
	res.json({ items: result.items.map(toProductView), page, pages: Math.ceil(total / limit), total })
}

const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

/** Letter sizes in clothing order, then numeric sizes, then anything else (e.g. "One size"). */
const compareSizes = (a, b) => {
	const rank = (value) => {
		const letter = LETTER_SIZES.indexOf(value)
		if (letter !== -1) return [0, letter]
		const number = Number(value)
		return Number.isFinite(number) ? [1, number] : [2, 0]
	}
	const [groupA, valueA] = rank(a.value)
	const [groupB, valueB] = rank(b.value)
	return groupA - groupB || valueA - valueB || a.value.localeCompare(b.value)
}

const countBy = (field) => [
	{ $group: { _id: field, count: { $sum: 1 } } },
	{ $project: { _id: 0, value: '$_id', count: 1 } },
	{ $sort: { value: 1 } },
]

/**
 * GET /products/facets — filter options for a category or search:
 * `{ brands, colors, sizes: [{ value, count }], price: { min, max } }`
 */
export const productFacets = async (req, res) => {
	const [result] = await Product.aggregate([
		{ $match: scopeFilter(req.valid.query) },
		{
			$facet: {
				brands: countBy('$brand'),
				colors: [{ $unwind: '$colors' }, ...countBy('$colors')],
				sizes: [{ $unwind: '$sizes' }, ...countBy('$sizes.label')],
				price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
			},
		},
	])

	const price = result.price[0]
	res.json({
		brands: result.brands,
		colors: result.colors,
		sizes: result.sizes.sort(compareSizes),
		price: price ? { min: price.min, max: price.max } : { min: 0, max: 0 },
	})
}

/** GET /products/:id — by id or slug */
export const getProduct = async (req, res) => {
	const product = await findActiveProduct(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

/** GET /products/:id/related — other products from the same categories, best rated first */
export const relatedProducts = async (req, res) => {
	const product = await findActiveProduct(req.valid.params.id)
	if (!product) throw notFound('Product')

	const related = await Product.find({
		active: true,
		_id: { $ne: product._id },
		categories: { $in: product.categories },
	})
		.sort({ 'rating.average': -1, createdAt: -1, _id: 1 })
		.limit(req.valid.query.limit)
		.lean()

	res.json(related.map(toProductView))
}

export const createProduct = async (req, res) => {
	const product = await Product.create(req.valid.body)
	res.status(201).json(toProductView(product))
}

export const updateProduct = async (req, res) => {
	const product = await Product.findByIdAndUpdate(req.valid.params.id, req.valid.body, {
		returnDocument: 'after',
		runValidators: true,
	})
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

export const deleteProduct = async (req, res) => {
	const product = await Product.findByIdAndDelete(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.status(204).end()
}
