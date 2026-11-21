import { describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { summarizeFit } from '../src/services/sizeFit.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

const buyer = async (username, product) => {
	const customer = await createUser({ username })
	await Order.create({
		user: customer.user._id,
		email: `${username}@example.com`,
		items: [
			{
				productId: product._id,
				quantity: 1,
				size: 'M',
				color: 'black',
				title: product.title,
				brand: product.brand,
				image: '/images/products/product.jpg',
				price: product.price,
			},
		],
		subtotal: 10,
		shipping: 0,
		amount: 10,
		address: validAddress,
		status: 'delivered',
	})
	return customer
}

const review = (product, auth, extra) =>
	api()
		.post(`/api/products/${product.id}/reviews`)
		.set(auth)
		.send({ rating: 4, body: 'Nice fabric, good cut.', ...extra })

describe('summarizeFit', () => {
	it('gives no verdict below 3 answers', () => {
		expect(summarizeFit({ small: 2 })).toEqual({
			counts: { small: 2, true: 0, large: 0 },
			total: 2,
			verdict: null,
			share: 0,
		})
	})

	it('gives a verdict when at least 60% agree', () => {
		expect(summarizeFit({ small: 7, true: 2, large: 1 })).toMatchObject({
			verdict: 'small',
			share: 0.7,
			total: 10,
		})
		expect(summarizeFit({ true: 3 })).toMatchObject({ verdict: 'true', share: 1 })
		expect(summarizeFit({ small: 3, large: 2 })).toMatchObject({ verdict: 'small', share: 0.6 })
	})

	it('gives no verdict for mixed opinions', () => {
		expect(summarizeFit({ small: 2, true: 2, large: 1 })).toMatchObject({
			verdict: null,
			total: 5,
		})
	})
})

describe('fit in reviews', () => {
	it('stores fit and size and summarizes them on the product', async () => {
		const product = await createProduct()
		const answers = ['small', 'small', 'small', 'true']
		for (const [i, fit] of answers.entries()) {
			const { auth } = await buyer(`buyer${i}`, product)
			await review(product, auth, { fit, sizeBought: 'M' }).expect(201)
		}
		// a review without fit data does not count
		const { auth } = await buyer('quiet', product)
		await review(product, auth).expect(201)

		const reviews = await api().get(`/api/products/${product.id}/reviews`).expect(200)
		expect(reviews.body.items[1]).toMatchObject({ fit: 'true', sizeBought: 'M' })

		const res = await api().get(`/api/products/${product.slug}`).expect(200)
		expect(res.body.fit).toEqual({
			counts: { small: 3, true: 1, large: 0 },
			total: 4,
			verdict: 'small',
			share: 0.75,
		})
	})

	it('rejects unknown fit values and sizes the product does not have', async () => {
		const product = await createProduct()
		const { auth } = await buyer('alice', product)
		await review(product, auth, { fit: 'huge' }).expect(400)
		const res = await review(product, auth, { sizeBought: 'XXL' }).expect(400)
		expect(res.body.details).toEqual([
			{ path: 'sizeBought', message: 'Choose one of the sizes of this product' },
		])
		await review(product, auth, { fit: 'large', sizeBought: 'S' }).expect(201)
	})

	it('has an empty summary without fit answers', async () => {
		const product = await createProduct()
		const res = await api().get(`/api/products/${product.id}`).expect(200)
		expect(res.body.fit).toMatchObject({ total: 0, verdict: null })
	})
})
