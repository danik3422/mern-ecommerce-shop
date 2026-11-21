import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { toProductView } from '../services/productView.js'
import { boughtTogether } from '../services/recommendations.js'
import {
	getSearchIndex,
	matchBrands,
	matchCategories,
	searchIndex,
	searchProducts,
} from '../services/search.js'
import { getFitSummary } from '../services/sizeFit.js'
import { notifyRestocked } from '../services/stockAlerts.js'
import { notFound } from '../utils/HttpError.js'

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	price_asc: { price: 1, _id: 1 },
	price_desc: { price: -1, _id: 1 },
	rating: { 'rating.average': -1, 'rating.count': -1, _id: 1 },
	discount: { discount: -1, createdAt: -1, _id: 1 },
	// position in the search results, see `relevanceOf`
	relevance: { relevance: 1, _id: 1 },
}

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id))

/**
 * Active products, optionally limited to a category and a search.
 * The search is typo tolerant (see services/search.js) unless `exact` is set.
 * @returns `{ filter, search }` — `search` is `{ ids, correctedQuery }` when searching
 */
const resolveScope = async ({ category, q, exact }) => {
	const filter = { active: true }
	if (category) filter.categories = category
	if (!q) return { filter, search: null }

	const search = await searchProducts(q, { exact })
	// aggregation $match does not cast strings, so ids must be ObjectIds
	filter.$and = [{ _id: { $in: search.ids.map(toObjectId) } }]
	return { filter, search }
}

const isOnSale = { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, '$price'] }

const buildFilter = (filter, { brand, color, size, minPrice, maxPrice, onSale, inStock, ids }) => {
	if (brand?.length) filter.brand = { $in: brand }
	// color, size and "in stock" must hold for the same variant:
	// "blue in M, in stock" does not match a product that has only black M in stock
	if (color?.length || size?.length || inStock) {
		const variantMatch = {}
		if (color?.length) variantMatch.color = { $in: color }
		if (size?.length || inStock) {
			const sizeMatch = {}
			if (size?.length) sizeMatch.label = { $in: size }
			if (inStock) sizeMatch.stock = { $gt: 0 }
			variantMatch.sizes = { $elemMatch: sizeMatch }
		}
		filter.variants = { $elemMatch: variantMatch }
	}

	if (minPrice !== undefined || maxPrice !== undefined) {
		filter.price = {}
		if (minPrice !== undefined) filter.price.$gte = minPrice
		if (maxPrice !== undefined) filter.price.$lte = maxPrice
	}
	if (onSale) filter.$expr = isOnSale
	if (ids) filter._id = { $in: ids.map(toObjectId) }
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

/** Position of a product in the ranked search results (for the "relevance" sort). */
const relevanceOf = (ids) => ({ $indexOfArray: [ids.map(toObjectId), '$_id'] })

/**
 * GET /products — public, paginated: `{ items, page, pages, total, search? }`.
 * With `q`, results are sorted by relevance unless another sort is chosen, and
 * `search: { query, correctedQuery }` tells whether typos were corrected
 * (e.g. "jaket" → "jacket").
 */
export const listProducts = async (req, res) => {
	const { sort: chosenSort, page, limit, category, q, exact, ...filters } = req.valid.query
	const { filter, search } = await resolveScope({ category, q, exact })
	// relevance needs a search; without one it falls back to the newest products
	const sort =
		chosenSort && (chosenSort !== 'relevance' || search)
			? chosenSort
			: search
				? 'relevance'
				: 'newest'

	const [result] = await Product.aggregate([
		{ $match: buildFilter(filter, filters) },
		{
			$addFields: {
				discount: discountShare,
				...(sort === 'relevance' && { relevance: relevanceOf(search.ids) }),
			},
		},
		{
			$facet: {
				items: [
					{ $sort: SORTS[sort] },
					{ $skip: (page - 1) * limit },
					{ $limit: limit },
					{ $project: { discount: 0, ...(sort === 'relevance' && { relevance: 0 }) } },
				],
				total: [{ $count: 'count' }],
			},
		},
	])

	const total = result.total[0]?.count ?? 0
	res.json({
		items: result.items.map(toProductView),
		page,
		pages: Math.ceil(total / limit),
		total,
		...(search && { search: { query: q, correctedQuery: search.correctedQuery } }),
	})
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

/** Number of distinct products per value (a product counts once even with several variants). */
const countProductsBy = (field) => [
	{ $group: { _id: field, products: { $addToSet: '$_id' } } },
	{ $project: { _id: 0, value: '$_id', count: { $size: '$products' } } },
	{ $sort: { value: 1 } },
]

/**
 * GET /products/facets — filter options for a category or search:
 * `{ brands, colors, sizes: [{ value, count }], price: { min, max } }`
 */
export const productFacets = async (req, res) => {
	const { filter } = await resolveScope(req.valid.query)
	const [result] = await Product.aggregate([
		{ $match: filter },
		{
			$facet: {
				brands: countProductsBy('$brand'),
				colors: [{ $unwind: '$variants' }, ...countProductsBy('$variants.color')],
				sizes: [
					{ $unwind: '$variants' },
					{ $unwind: '$variants.sizes' },
					...countProductsBy('$variants.sizes.label'),
				],
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

/**
 * GET /products/suggestions?q= — for the search box:
 * `{ products, total, brands: [{ value, count }], categories: [slug], correctedQuery }`
 */
export const searchSuggestions = async (req, res) => {
	const { q, limit } = req.valid.query
	const index = await getSearchIndex()
	const search = searchIndex(index, q)
	const ranked = search.ids.slice(0, limit)

	const products = await Product.find({ _id: { $in: ranked }, active: true }).lean()
	const byId = new Map(products.map((product) => [String(product._id), product]))

	const productsPerBrand = Map.groupBy(index.entries, (entry) => entry.brand)
	const brands = matchBrands(index, q)
		.slice(0, 3)
		.map((brand) => ({ value: brand, count: productsPerBrand.get(brand).length }))
	// only categories that have products
	const categories = matchCategories(q)
		.filter((slug) => index.entries.some((entry) => entry.categories.includes(slug)))
		.slice(0, 2)

	res.json({
		products: ranked
			.map((id) => byId.get(String(id)))
			.filter(Boolean)
			.map(toProductView),
		total: search.ids.length,
		brands,
		categories,
		correctedQuery: search.correctedQuery,
	})
}

/** GET /products/:id — by id or slug; `fit` summarizes what reviewers say about the fit */
export const getProduct = async (req, res) => {
	const product = await findActiveProduct(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.json({ ...toProductView(product), fit: await getFitSummary(product._id) })
}

/**
 * GET /products/:id/bought-together — `{ source: 'orders' | 'related', items }`:
 * products often bought in the same orders, or similar products while there is too little
 * order data. Only available products, never the product itself.
 */
export const boughtTogetherProducts = async (req, res) => {
	const product = await findActiveProduct(req.valid.params.id)
	if (!product) throw notFound('Product')
	const { source, items } = await boughtTogether(product, req.valid.query.limit)
	res.json({
		source,
		items: items.map((item) => ({ ...toProductView(item), orders: item.orders })),
	})
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
	if (req.valid.body.variants || req.valid.body.active) await notifyRestocked([product._id])
	res.json(toProductView(product))
}

export const deleteProduct = async (req, res) => {
	const product = await Product.findByIdAndDelete(req.valid.params.id)
	if (!product) throw notFound('Product')
	// for the activity log
	res.locals.label = product.title
	res.status(204).end()
}
