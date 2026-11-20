import { z } from 'zod'
import { imagePath, objectId } from './common.js'

const tag = z.string().trim().toLowerCase().min(1).max(30)

const size = z.strictObject({
	label: z.string().trim().min(1).max(20),
	stock: z.int().min(0).max(100_000),
})

const unique = (list, key) => new Set(list.map(key)).size === list.length

const variant = z.strictObject({
	color: tag,
	images: z.array(imagePath).min(1).max(10),
	sizes: z
		.array(size)
		.min(1)
		.max(30)
		.refine((sizes) => unique(sizes, (s) => s.label), 'Size labels must be unique'),
})

const productFields = z.strictObject({
	title: z.string().trim().min(1).max(120),
	slug: z
		.string()
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and dashes'),
	brand: z.string().trim().min(1).max(60),
	description: z.string().trim().min(1).max(4000),
	categories: z.array(tag).max(20).default([]),
	variants: z
		.array(variant)
		.min(1, 'Add at least one color')
		.max(20)
		.refine((variants) => unique(variants, (v) => v.color), 'Each color can appear only once'),
	price: z.number().nonnegative(),
	// null removes the discount on update
	compareAtPrice: z.number().nonnegative().nullable().optional(),
	active: z.boolean().default(true),
})

const compareAtPriceIsHigher = {
	check: (p) => p.compareAtPrice == null || p.price === undefined || p.compareAtPrice > p.price,
	error: { message: 'Compare-at price must be higher than the price', path: ['compareAtPrice'] },
}

export const createProductBody = productFields.refine(
	compareAtPriceIsHigher.check,
	compareAtPriceIsHigher.error,
)

// on update, defaults must not overwrite stored values, so they are removed
export const updateProductBody = productFields
	.extend({
		categories: productFields.shape.categories.removeDefault(),
		active: productFields.shape.active.removeDefault(),
	})
	.partial()
	.refine((body) => Object.keys(body).length > 0, 'Nothing to update')
	.refine(compareAtPriceIsHigher.check, compareAtPriceIsHigher.error)

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'rating', 'discount']

/** "a,b,c" → ['a', 'b', 'c'] (trimmed, empty parts dropped) */
const commaList = (item, max = 50) =>
	z
		.string()
		.transform((value) =>
			value
				.split(',')
				.map((part) => part.trim())
				.filter(Boolean),
		)
		.pipe(z.array(item).max(max))

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true')

const price = z.coerce.number().nonnegative()

/** Filters shared by the product list and the facets endpoint. */
const scopeFields = {
	category: z.string().trim().toLowerCase().max(30).optional(),
	// free-text search in title, brand and description
	q: z.string().trim().max(100).optional(),
}

export const listProductsQuery = z
	.object({
		...scopeFields,
		brand: commaList(z.string().max(60)).optional(),
		color: commaList(z.string().toLowerCase().max(30)).optional(),
		size: commaList(z.string().max(20)).optional(),
		minPrice: price.optional(),
		maxPrice: price.optional(),
		onSale: booleanFlag.optional(),
		inStock: booleanFlag.optional(),
		// comma-separated product ids, used by the cart to load fresh prices
		ids: commaList(objectId, 100).optional(),
		sort: z.enum(PRODUCT_SORTS).default('newest'),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
	})
	.refine(
		(query) =>
			query.minPrice === undefined ||
			query.maxPrice === undefined ||
			query.minPrice <= query.maxPrice,
		{ message: 'minPrice must not be greater than maxPrice', path: ['minPrice'] },
	)

export const facetsQuery = z.object(scopeFields)

export const relatedQuery = z.object({
	limit: z.coerce.number().int().min(1).max(12).default(4),
})

/** `:id` may be a Mongo id or a slug */
export const productRefParams = z.object({
	id: z.string().trim().min(1).max(120),
})
