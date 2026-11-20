import { http } from './client'

/** @returns {Promise<{ items, page, pages, total, summary: { average, count, distribution } }>} */
export const fetchReviews = (productId, params, signal) =>
	http.get(`/products/${productId}/reviews`, { params, signal }).then((r) => r.data)

/** @param review `{ rating: 1..5, title?, body }` */
export const createReview = (productId, review) =>
	http.post(`/products/${productId}/reviews`, review).then((r) => r.data)

/** @returns {Promise<{ canReview: boolean, reason: 'not_purchased' | 'already_reviewed' | null }>} */
export const fetchReviewEligibility = (productId, signal) =>
	http.get(`/products/${productId}/reviews/eligibility`, { signal }).then((r) => r.data)

export const deleteReview = (productId, reviewId) =>
	http.delete(`/products/${productId}/reviews/${reviewId}`)

export const reviewKeys = {
	all: (productId) => ['reviews', productId],
	list: (productId, params) => ['reviews', productId, params],
	eligibility: (productId, userId) => ['reviews', productId, 'eligibility', userId],
}
