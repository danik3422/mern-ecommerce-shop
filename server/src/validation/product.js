import { z } from 'zod'
import { objectId } from './common.js'

const tags = z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20)

export const createProductBody = z.strictObject({
	title: z.string().trim().min(1).max(120),
	description: z.string().trim().min(1).max(2000),
	img: z.url(),
	categories: tags.default([]),
	size: z.array(z.string().trim().min(1).max(10)).max(20).default([]),
	color: tags.default([]),
	price: z.number().nonnegative(),
	inStock: z.boolean().default(true),
})

export const updateProductBody = createProductBody
	.partial()
	.refine((body) => Object.keys(body).length > 0, 'Nothing to update')

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
