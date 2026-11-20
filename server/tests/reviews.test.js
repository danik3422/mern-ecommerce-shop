import { describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

/** Creates an order directly, so these tests do not depend on the checkout flow. */
const createOrder = (userId, product, status = 'delivered') =>
	Order.create({
		user: userId,
		email: 'customer@example.com',
		items: [
			{
				productId: product.id,
				quantity: 1,
				size: 'M',
				color: 'black',
				title: product.title,
				brand: product.brand,
				image: product.variants[0].images[0],
				price: product.price,
			},
		],
		subtotal: product.price,
		shipping: 0,
		amount: product.price,
		address: validAddress,
		status,
	})

const review = (rating, body = 'Fits well and feels great.') => ({ rating, body })

/** A product with a customer who ordered it. */
const setup = async (username = 'alice') => {
	const product = await createProduct()
	const customer = await createUser({ username })
	await createOrder(customer.user._id, product)
	return { product, ...customer }
}

const reviewsUrl = (product) => `/api/products/${product.id}/reviews`

describe('POST /api/products/:productId/reviews', () => {
	it('lets a customer who ordered the product review it and updates the product rating', async () => {
		const { product, auth } = await setup()

		const res = await api()
			.post(reviewsUrl(product))
			.set(auth)
			.send({ ...review(4), title: 'Nice' })
			.expect(201)
		expect(res.body).toMatchObject({ rating: 4, title: 'Nice', username: 'alice' })

		const stored = await Product.findById(product.id).lean()
		expect(stored.rating).toEqual({ average: 4, count: 1 })
	})

	it('rejects customers who did not buy the product: no order, unpaid or cancelled', async () => {
		const product = await createProduct()
		const { user, auth } = await createUser()
		await api().post(reviewsUrl(product)).set(auth).send(review(5)).expect(403)

		await createOrder(user._id, product, 'pending')
		await createOrder(user._id, product, 'cancelled')
		const res = await api().post(reviewsUrl(product)).set(auth).send(review(5)).expect(403)
		expect(res.body.message).toMatch(/bought/)
	})

	it.each(['paid', 'shipped', 'delivered'])('accepts buyers with a %s order', async (status) => {
		const product = await createProduct()
		const { user, auth } = await createUser()
		await createOrder(user._id, product, status)
		await api().post(reviewsUrl(product)).set(auth).send(review(5)).expect(201)
	})

	it('allows one review per product', async () => {
		const { product, auth } = await setup()
		await api().post(reviewsUrl(product)).set(auth).send(review(5)).expect(201)
		const res = await api().post(reviewsUrl(product)).set(auth).send(review(3)).expect(409)
		expect(res.body.message).toMatch(/already reviewed/)
	})

	it('validates the review', async () => {
		const { product, auth } = await setup()
		await api().post(reviewsUrl(product)).set(auth).send(review(0)).expect(400)
		await api().post(reviewsUrl(product)).set(auth).send(review(6)).expect(400)
		await api().post(reviewsUrl(product)).set(auth).send(review(4.5)).expect(400)
		await api().post(reviewsUrl(product)).set(auth).send(review(4, 'short')).expect(400)
		await api()
			.post(reviewsUrl(product))
			.set(auth)
			.send({ ...review(4), user: 'someone-else' })
			.expect(400)
	})

	it('requires sign-in and an existing product', async () => {
		const { product, auth } = await setup()
		await api().post(reviewsUrl(product)).send(review(5)).expect(401)
		await api()
			.post('/api/products/507f1f77bcf86cd799439011/reviews')
			.set(auth)
			.send(review(5))
			.expect(404)
	})
})

describe('GET /api/products/:productId/reviews/eligibility', () => {
	it('tells whether the customer may review the product and why not', async () => {
		const product = await createProduct()
		const { user, auth } = await createUser()
		const url = `${reviewsUrl(product)}/eligibility`

		await api().get(url).expect(401)
		let res = await api().get(url).set(auth).expect(200)
		expect(res.body).toEqual({ canReview: false, reason: 'not_purchased' })

		await createOrder(user._id, product, 'paid')
		res = await api().get(url).set(auth).expect(200)
		expect(res.body).toEqual({ canReview: true, reason: null })

		await api().post(reviewsUrl(product)).set(auth).send(review(4)).expect(201)
		res = await api().get(url).set(auth).expect(200)
		expect(res.body).toEqual({ canReview: false, reason: 'already_reviewed' })
	})
})

describe('GET /api/products/:productId/reviews', () => {
	it('is public, paginated, newest first and includes a summary', async () => {
		const product = await createProduct()
		for (const [username, rating] of [
			['ann', 5],
			['ben', 4],
			['cat', 5],
		]) {
			const { user, auth } = await createUser({ username })
			await createOrder(user._id, product)
			await api().post(reviewsUrl(product)).set(auth).send(review(rating))
		}

		const res = await api()
			.get(`${reviewsUrl(product)}?limit=2`)
			.expect(200)
		expect(res.body).toMatchObject({ page: 1, pages: 2, total: 3 })
		expect(res.body.items.map((r) => r.username)).toEqual(['cat', 'ben'])
		expect(res.body.summary).toEqual({
			average: 4.7,
			count: 3,
			distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
		})
	})

	it('returns an empty summary and 404 for hidden products', async () => {
		const product = await createProduct()
		const res = await api().get(reviewsUrl(product)).expect(200)
		expect(res.body).toMatchObject({ items: [], total: 0, summary: { average: 0, count: 0 } })

		const hidden = await createProduct({ active: false })
		await api().get(reviewsUrl(hidden)).expect(404)
		await api().get('/api/products/not-an-id/reviews').expect(400)
	})
})

describe('DELETE /api/products/:productId/reviews/:reviewId', () => {
	it('lets the author delete their review and updates the rating', async () => {
		const { product, auth } = await setup()
		const created = (await api().post(reviewsUrl(product)).set(auth).send(review(2))).body

		await api()
			.delete(`${reviewsUrl(product)}/${created._id}`)
			.set(auth)
			.expect(204)
		const stored = await Product.findById(product.id).lean()
		expect(stored.rating).toEqual({ average: 0, count: 0 })
	})

	it('lets admins delete any review but not other customers', async () => {
		const { product, auth } = await setup('alice')
		const created = (await api().post(reviewsUrl(product)).set(auth).send(review(1))).body
		const bob = await createUser({ username: 'bob' })
		const admin = await createUser({ username: 'admin', isAdmin: true })

		await api()
			.delete(`${reviewsUrl(product)}/${created._id}`)
			.set(bob.auth)
			.expect(403)
		await api()
			.delete(`${reviewsUrl(product)}/${created._id}`)
			.set(admin.auth)
			.expect(204)
		await api()
			.delete(`${reviewsUrl(product)}/${created._id}`)
			.set(admin.auth)
			.expect(404)
	})

	it('only deletes reviews that belong to the given product', async () => {
		const { product, auth } = await setup()
		const other = await createProduct()
		const created = (await api().post(reviewsUrl(product)).set(auth).send(review(5))).body
		await api()
			.delete(`${reviewsUrl(other)}/${created._id}`)
			.set(auth)
			.expect(404)
	})
})

describe('account deletion', () => {
	it('keeps reviews with the username snapshot', async () => {
		const { product, auth } = await setup('alice')
		await api().post(reviewsUrl(product)).set(auth).send(review(5))
		await api().delete('/api/users/me').set(auth).expect(204)

		const res = await api().get(reviewsUrl(product))
		expect(res.body.items[0].username).toBe('alice')
	})
})
