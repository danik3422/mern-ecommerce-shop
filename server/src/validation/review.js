import { z } from 'zod'
import { objectId } from './common.js'

export const reviewProductParams = z.object({ productId: objectId })

export const reviewParams = z.object({ productId: objectId, reviewId: objectId })

export const listReviewsQuery = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(5),
})

export const createReviewBody = z.strictObject({
	rating: z.int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5'),
	title: z.string().trim().max(120).optional(),
	body: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
})
