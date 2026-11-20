import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'

const roundRating = (value) => Math.round(value * 10) / 10

/** `{ average, count, distribution: { 1..5: count } }` for a product's reviews. */
export const getRatingSummary = async (productId) => {
	const groups = await Review.aggregate([
		{ $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
		{ $group: { _id: '$rating', count: { $sum: 1 } } },
	])

	const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
	let count = 0
	let total = 0
	for (const group of groups) {
		distribution[group._id] = group.count
		count += group.count
		total += group._id * group.count
	}

	return { average: count ? roundRating(total / count) : 0, count, distribution }
}

/** Recomputes the denormalized `product.rating` after reviews change. */
export const syncProductRating = async (productId) => {
	const { average, count } = await getRatingSummary(productId)
	await Product.updateOne({ _id: productId }, { rating: { average, count } })
}

/** Orders that count as a purchase: unpaid and cancelled orders do not. */
export const PURCHASED_STATUSES = ['paid', 'shipped', 'delivered']

/** Only customers who bought the product may review it. */
export const hasPurchased = (userId, productId) =>
	Order.exists({ user: userId, 'items.productId': productId, status: { $in: PURCHASED_STATUSES } })

/**
 * Whether a customer may write a review now.
 * @returns `{ canReview, reason }` — reason is 'not_purchased' or 'already_reviewed' when not
 */
export const getReviewEligibility = async (userId, productId) => {
	if (await Review.exists({ product: productId, user: userId })) {
		return { canReview: false, reason: 'already_reviewed' }
	}
	if (!(await hasPurchased(userId, productId))) {
		return { canReview: false, reason: 'not_purchased' }
	}
	return { canReview: true, reason: null }
}
