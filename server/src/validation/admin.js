import { z } from 'zod'
import { ORDER_STATUSES, RETURN_STATUSES } from '../models/Order.js'

const page = z.coerce.number().int().min(1).default(1)
const limit = z.coerce.number().int().min(1).max(100).default(20)
const search = z.string().trim().max(100).optional()

export const adminProductsQuery = z.object({
	q: search,
	status: z.enum(['active', 'hidden']).optional(),
	lowStock: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.optional(),
	page,
	limit,
})

export const adminOrdersQuery = z.object({
	status: z.enum(ORDER_STATUSES).optional(),
	returnStatus: z.enum(RETURN_STATUSES).optional(),
	// customer username/email or order id
	q: search,
	page,
	limit,
})

export const adminReviewsQuery = z.object({ page, limit })
