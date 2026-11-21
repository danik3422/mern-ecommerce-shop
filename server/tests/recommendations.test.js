import { describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { api, createProduct, validAddress } from './helpers.js'

/** An order with one line per product. */
const order = (products, status = 'paid') =>
	Order.create({
		email: 'customer@example.com',
		items: products.map((product) => ({
			productId: product._id,
			quantity: 1,
			size: 'M',
			color: 'black',
			title: product.title,
			brand: product.brand,
			image: '/images/products/product.jpg',
			price: product.price,
		})),
		subtotal: 10,
		shipping: 0,
		amount: 10,
		address: validAddress,
		status,
	})

const boughtTogether = (product) =>
	api()
		.get(`/api/products/${product.slug}/bought-together`)
		.expect(200)
		.then((res) => res.body)

describe('GET /api/products/:id/bought-together', () => {
	it('ranks products by the number of distinct orders shared with the product', async () => {
		const main = await createProduct({ categories: ['women'] })
		const often = await createProduct({ categories: ['accessories'] })
		const sometimes = await createProduct({ categories: ['accessories'] })
		const once = await createProduct({ categories: ['accessories'] })

		await order([main, often])
		await order([main, often, sometimes, once])
		await order([main, often])
		// two lines of the same product in one order count once
		await order([main, sometimes, sometimes], 'delivered')
		// cancelled orders and orders without the product do not count
		await order([main, once], 'cancelled')
		await order([main, once], 'cancelled')
		await order([often, once])

		const body = await boughtTogether(main)
		expect(body.source).toBe('orders')
		expect(body.items.map((item) => item.title)).toEqual([often.title, sometimes.title])
		expect(body.items.map((item) => item.orders)).toEqual([3, 2])
		expect(body.items[0]).toMatchObject({ inStock: true, colors: ['black', 'white'] })
	})

	it('skips the product itself, hidden and sold-out products, and returns at most 4', async () => {
		const main = await createProduct()
		const hidden = await createProduct({ active: false })
		const soldOut = await createProduct({ sizes: [{ label: 'M', stock: 0 }] })
		const others = []
		for (let i = 0; i < 5; i++) others.push(await createProduct())

		for (let i = 0; i < 2; i++) await order([main, hidden, soldOut, ...others])

		const body = await boughtTogether(main)
		expect(body.source).toBe('orders')
		expect(body.items).toHaveLength(4)
		const ids = body.items.map((item) => item._id)
		expect(ids).not.toContain(main.id)
		expect(ids).not.toContain(hidden.id)
		expect(ids).not.toContain(soldOut.id)
	})

	it('falls back to similar products while there are too few shared orders', async () => {
		const main = await createProduct({ categories: ['coats'], brand: 'Aster' })
		const sameCategory = await createProduct({ categories: ['coats'], brand: 'Other' })
		const sameBrand = await createProduct({ categories: ['bags'], brand: 'Aster' })
		await createProduct({ categories: ['bags'], brand: 'Other' })
		const boughtOnce = await createProduct({ categories: ['tees'], brand: 'Other' })
		// a single shared order is not enough to call it "frequently"
		await order([main, boughtOnce])

		const body = await boughtTogether(main)
		expect(body.source).toBe('related')
		expect(body.items.map((item) => item.title).sort()).toEqual(
			[sameCategory.title, sameBrand.title].sort(),
		)
	})

	it('returns 404 for unknown products', async () => {
		await api().get('/api/products/nope/bought-together').expect(404)
	})
})
