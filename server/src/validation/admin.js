import { z } from 'zod'
import { ORDER_STATUSES, RETURN_STATUSES } from '../models/Order.js'
import { objectId } from './common.js'

const page = z.coerce.number().int().min(1).default(1)
const limit = z.coerce.number().int().min(1).max(100).default(20)
const search = z.string().trim().max(100).optional()
const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true')

export const ADMIN_PRODUCT_SORTS = [
	'newest',
	'oldest',
	'title_asc',
	'title_desc',
	'price_asc',
	'price_desc',
	'stock_asc',
	'stock_desc',
]

export const adminProductsQuery = z.object({
	// title, brand or slug
	q: search,
	status: z.enum(['active', 'hidden']).optional(),
	category: z.string().trim().toLowerCase().max(30).optional(),
	brand: z.string().trim().max(60).optional(),
	onSale: booleanFlag.optional(),
	// low: at least one size at or below the low-stock threshold; out: nothing left in any size
	stock: z.enum(['low', 'out']).optional(),
	// older name of stock=low, kept for existing links
	lowStock: booleanFlag.optional(),
	// missing_pl: the Polish description is still empty
	translation: z.enum(['missing_pl']).optional(),
	sort: z.enum(ADMIN_PRODUCT_SORTS).default('newest'),
	page,
	limit,
})

export const BULK_PRODUCT_ACTIONS = ['show', 'hide', 'delete', 'discount']

export const bulkProductsBody = z
	.strictObject({
		ids: z
			.array(objectId)
			.min(1, 'Select at least one product')
			.max(100)
			.transform((ids) => [...new Set(ids)]),
		action: z.enum(BULK_PRODUCT_ACTIONS),
		// discount only: percent off the regular price; 0 ends the sale
		percent: z.int().min(0).max(90).optional(),
	})
	.refine((body) => body.action !== 'discount' || body.percent !== undefined, {
		message: 'Enter a discount between 0 and 90%',
		path: ['percent'],
	})

/** YYYY-MM-DD */
const day = z.iso.date('Use the format YYYY-MM-DD')

export const adminOrdersQuery = z
	.object({
		status: z.enum(ORDER_STATUSES).optional(),
		returnStatus: z.enum(RETURN_STATUSES).optional(),
		// order number or id, customer username/email, guest email or the name on the address
		q: search,
		// placed on or after / on or before these days (UTC)
		from: day.optional(),
		to: day.optional(),
		page,
		limit,
	})
	.refine((query) => !query.from || !query.to || query.from <= query.to, {
		message: '"From" must not be after "to"',
		path: ['from'],
	})

export const orderNoteBody = z.strictObject({ adminNote: z.string().trim().max(2000) })

export const adminReviewsQuery = z.object({ page, limit })

export const adminCustomersQuery = z.object({
	// username or email
	q: search,
	status: z.enum(['active', 'blocked']).optional(),
	sort: z.enum(['newest', 'oldest', 'spent']).default('newest'),
	page,
	limit,
})

export const updateCustomerBody = z.strictObject({ blocked: z.boolean() })
