import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import { getRatingSummary, hasPurchased, syncProductRating } from '../services/reviews.js'
import { conflict, forbidden, notFound } from '../utils/HttpError.js'

const ensureActiveProduct = async (productId) => {
	const exists = await Product.exists({ _id: productId, active: true })
	if (!exists) throw notFound('Product')
}

/** GET /products/:productId/reviews — public, newest first, with a rating summary */
export const listReviews = async (req, res) => {
	const { productId } = req.valid.params
	const { page, limit } = req.valid.query
	await ensureActiveProduct(productId)

	const [items, summary] = await Promise.all([
		Review.find({ product: productId })
			.sort({ createdAt: -1, _id: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		getRatingSummary(productId),
	])

	res.json({ items, page, pages: Math.ceil(summary.count / limit), total: summary.count, summary })
}

/** POST /products/:productId/reviews — verified buyers only, one review per product */
export const createReview = async (req, res) => {
	const { productId } = req.valid.params
	await ensureActiveProduct(productId)

	if (!(await hasPurchased(req.user.id, productId))) {
		throw forbidden('Only customers who ordered this product can review it')
	}
	if (await Review.exists({ product: productId, user: req.user.id })) {
		throw conflict('You have already reviewed this product')
	}

	const { username } = await User.findById(req.user.id).lean()
	// a parallel duplicate still hits the unique index and becomes 409
	const review = await Review.create({
		...req.valid.body,
		product: productId,
		user: req.user.id,
		username,
	})
	await syncProductRating(productId)

	res.status(201).json(review)
}

/** DELETE /products/:productId/reviews/:reviewId — the author or an admin */
export const deleteReview = async (req, res) => {
	const { productId, reviewId } = req.valid.params
	const review = await Review.findOne({ _id: reviewId, product: productId })
	if (!review) throw notFound('Review')

	const isAuthor = review.user.toString() === req.user.id
	if (!isAuthor && !req.user.isAdmin) throw forbidden()

	await review.deleteOne()
	await syncProductRating(productId)
	res.status(204).end()
}
