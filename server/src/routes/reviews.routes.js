import { Router } from 'express'
import * as reviews from '../controllers/reviews.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
	createReviewBody,
	listReviewsQuery,
	reviewParams,
	reviewProductParams,
} from '../validation/review.js'

/**
 * Mounted at /api/products/:productId/reviews.
 * mergeParams gives access to :productId.
 */
export const reviewRoutes = Router({ mergeParams: true })

reviewRoutes.get(
	'/',
	validate({ params: reviewProductParams, query: listReviewsQuery }),
	reviews.listReviews,
)
reviewRoutes.get(
	'/eligibility',
	requireAuth,
	validate({ params: reviewProductParams }),
	reviews.reviewEligibility,
)
reviewRoutes.post(
	'/',
	requireAuth,
	validate({ params: reviewProductParams, body: createReviewBody }),
	reviews.createReview,
)
reviewRoutes.delete(
	'/:reviewId',
	requireAuth,
	validate({ params: reviewParams }),
	reviews.deleteReview,
)
