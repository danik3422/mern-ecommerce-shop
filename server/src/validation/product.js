import { z } from 'zod'
import { imagePath, objectId } from './common.js'

const tag = z.string().trim().toLowerCase().min(1).max(30)

const size = z.strictObject({
	label: z.string().trim().min(1).max(20),
	stock: z.int().min(0).max(100_000),
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
	images: z.array(imagePath).min(1).max(10),
	categories: z.array(tag).max(20).default([]),
	colors: z.array(tag).max(20).default([]),
	sizes: z
		.array(size)
		.min(1)
		.max(30)
		.refine(
			(sizes) => new Set(sizes.map((s) => s.label)).size === sizes.length,
			'Size labels must be unique',
		),
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
		colors: productFields.shape.colors.removeDefault(),
		active: productFields.shape.active.removeDefault(),
	})
	.partial()
	.refine((body) => Object.keys(body).length > 0, 'Nothing to update')
	.refine(compareAtPriceIsHigher.check, compareAtPriceIsHigher.error)

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc']

export const listProductsQuery = z.object({
	category: z.string().trim().toLowerCase().optional(),
	color: z.string().trim().toLowerCase().optional(),
	size: z.string().trim().optional(),
	// comma-separated product ids, used by the cart to load fresh prices
	ids: z
		.string()
		.transform((value) => value.split(',').filter(Boolean))
		.pipe(z.array(objectId).max(100))
		.optional(),
	sort: z.enum(PRODUCT_SORTS).default('newest'),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** `:id` may be a Mongo id or a slug */
export const productRefParams = z.object({
	id: z.string().trim().min(1).max(120),
})
