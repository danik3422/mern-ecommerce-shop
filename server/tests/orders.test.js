import { describe, expect, it } from 'vitest'
import { Product } from '../src/models/Product.js'
import { api, createProduct, createUser, validAddress, stockOf } from './helpers.js'
import { price, roundMoney } from './pricingHelpers.js'
import { SHOP } from '../src/config/shop.js'

const orderBody = (product, overrides = {}) => ({
	items: [{ productId: product.id, quantity: 2, color: 'black', size: 'M', ...overrides }],
	address: validAddress,
})

const stockInBlack = (product, size = 'M') => stockOf(product.id, 'black', size)

const placeOrder = async (auth, body) => {
	const res = await api().post('/api/orders').set(auth).send(body).expect(201)
	return res.body.order
}

describe('POST /api/orders', () => {
	it('calculates the amount on the server and stores a product snapshot', async () => {
		const product = await createProduct({ title: 'Coat', brand: 'Aster', price: 19.99 })
		const { auth } = await createUser()

		const res = await api()
			.post('/api/orders')
			.set(auth)
			.send({ ...orderBody(product), amount: 1 })
			.expect(400) // unknown field "amount" is rejected
		expect(res.body.details[0].message).toMatch(/unrecognized/i)

		const created = await api().post('/api/orders').set(auth).send(orderBody(product)).expect(201)
		// without Stripe keys the order is "pay later"
		expect(created.body.checkoutUrl).toBeNull()
		expect(created.body.order).toMatchObject({
			subtotal: 39.98,
			shipping: price('standard'),
			amount: roundMoney(39.98 + price('standard')),
			status: 'pending',
			payment: { provider: 'none' },
		})
		expect(created.body.order.items[0]).toMatchObject({
			title: 'Coat',
			brand: 'Aster',
			image: '/images/products/product.jpg',
			price: 19.99,
			quantity: 2,
			size: 'M',
			color: 'black',
		})
	})

	it('keeps the original price when the product price changes later', async () => {
		const product = await createProduct({ price: 10 })
		const { auth } = await createUser()
		await placeOrder(auth, orderBody(product))

		await Product.updateOne({ _id: product.id }, { price: 500 })

		const [order] = (await api().get('/api/orders/mine').set(auth)).body
		expect(order.items[0].price).toBe(10)
	})

	it('rejects items without enough stock in the chosen size with 409', async () => {
		const product = await createProduct({
			sizes: [
				{ label: 'S', stock: 0 },
				{ label: 'M', stock: 1 },
			],
		})
		const { auth } = await createUser()

		const soldOut = await api()
			.post('/api/orders')
			.set(auth)
			.send(orderBody(product, { size: 'S', quantity: 1 }))
			.expect(409)
		expect(soldOut.body.details[0].message).toMatch(/sold out in black, size S/)

		const notEnough = await api().post('/api/orders').set(auth).send(orderBody(product)).expect(409)
		expect(notEnough.body.details[0].message).toMatch(/Only 1 left .* in black, size M/)
	})

	it('rejects options the product does not offer', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const post = (overrides) =>
			api().post('/api/orders').set(auth).send(orderBody(product, overrides))

		await post({ color: 'rainbow' }).expect(400)
		await post({ size: 'XXXL' }).expect(400)
		await post({ size: undefined }).expect(400)
	})

	it('requires a complete address and at least one item', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const noCity = { ...orderBody(product), address: { ...validAddress, city: '' } }
		await api().post('/api/orders').set(auth).send(noCity).expect(400)
		await api().post('/api/orders').set(auth).send({ items: [], address: validAddress }).expect(400)
	})

	it('clears the saved cart after ordering', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const body = orderBody(product)
		await api().put('/api/cart').set(auth).send({ items: body.items }).expect(200)

		await placeOrder(auth, body)
		expect((await api().get('/api/cart').set(auth)).body.items).toEqual([])
	})
})

describe('stock reservation', () => {
	it('takes ordered items from stock and returns them when the order is cancelled', async () => {
		const product = await createProduct()
		const { auth } = await createUser()

		const order = await placeOrder(auth, orderBody(product, { quantity: 2 }))
		expect(await stockInBlack(product)).toBe(3)

		await api().post(`/api/orders/${order._id}/cancel`).set(auth).expect(200)
		expect(await stockInBlack(product)).toBe(5)
	})

	it('sells the last item only once when customers order at the same time', async () => {
		const product = await createProduct({ sizes: [{ label: 'M', stock: 1 }] })
		const customers = await Promise.all(
			['ann', 'ben', 'cat'].map((username) => createUser({ username })),
		)

		const statuses = await Promise.all(
			customers.map(({ auth }) =>
				api()
					.post('/api/orders')
					.set(auth)
					.send(orderBody(product, { quantity: 1 }))
					.then((res) => res.status),
			),
		)

		expect(statuses.sort()).toEqual([201, 409, 409])
		expect(await stockInBlack(product)).toBe(0)
	})

	it('reserves all items or none of them', async () => {
		const product = await createProduct({ sizes: [{ label: 'M', stock: 1 }] })
		const { auth } = await createUser()
		const line = { productId: product.id, quantity: 1, color: 'black', size: 'M' }

		// each line alone fits, but together they need 2 of the 1 left
		const res = await api()
			.post('/api/orders')
			.set(auth)
			.send({ items: [line, line], address: validAddress })
			.expect(409)

		expect(res.body.details[0].path).toBe('items.1')
		expect(await stockInBlack(product)).toBe(1)
	})
})

describe('customer order actions', () => {
	it('shows an order to its owner and admins only', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await placeOrder(alice.auth, orderBody(product))

		await api().get(`/api/orders/${order._id}`).set(alice.auth).expect(200)
		await api().get(`/api/orders/${order._id}`).set(admin.auth).expect(200)
		await api().get(`/api/orders/${order._id}`).set(bob.auth).expect(404)
		await api().get(`/api/orders/${order._id}`).expect(404) // could be a guest without the token: do not reveal the order
		await api().get('/api/orders/not-an-id').set(alice.auth).expect(400)
	})

	it('lets customers cancel their own pending orders once', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const order = await placeOrder(alice.auth, orderBody(product))

		await api().post(`/api/orders/${order._id}/cancel`).set(bob.auth).expect(404)

		const cancelled = await api().post(`/api/orders/${order._id}/cancel`).set(alice.auth)
		expect(cancelled.status).toBe(200)
		expect(cancelled.body.status).toBe('cancelled')

		await api().post(`/api/orders/${order._id}/cancel`).set(alice.auth).expect(409)
		expect(await stockInBlack(product)).toBe(5)
	})

	it('does not let customers cancel paid orders', async () => {
		const product = await createProduct()
		const customer = await createUser({ username: 'alice' })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await placeOrder(customer.auth, orderBody(product))
		await api()
			.patch(`/api/orders/${order._id}/status`)
			.set(admin.auth)
			.send({ status: 'paid' })
			.expect(200)

		await api().post(`/api/orders/${order._id}/cancel`).set(customer.auth).expect(409)
	})

	it('rejects online payment when Stripe is not configured', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const order = await placeOrder(auth, orderBody(product))

		const res = await api().post(`/api/orders/${order._id}/pay`).set(auth).expect(409)
		expect(res.body.message).toMatch(/not available/)
	})
})

describe('order management', () => {
	it('shows users only their own orders', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		await placeOrder(alice.auth, orderBody(product))

		expect((await api().get('/api/orders/mine').set(alice.auth)).body).toHaveLength(1)
		expect((await api().get('/api/orders/mine').set(bob.auth)).body).toHaveLength(0)
		await api().get('/api/orders').set(bob.auth).expect(403)
	})

	it('moves orders through allowed statuses only', async () => {
		// two items reach the free-shipping threshold exactly
		const product = await createProduct({ price: SHOP.freeShippingFrom / 2 })
		const customer = await createUser({ username: 'alice' })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await placeOrder(customer.auth, orderBody(product))
		const setStatus = (status) =>
			api().patch(`/api/orders/${order._id}/status`).set(admin.auth).send({ status })

		expect((await api().get('/api/orders').set(admin.auth)).body).toHaveLength(1)

		await setStatus('shipped').expect(409) // must be paid first
		const paid = await setStatus('paid').expect(200)
		expect(paid.body.payment.paidAt).toEqual(expect.any(String))
		await setStatus('shipped').expect(200)
		const delivered = await setStatus('delivered').expect(200)
		expect(delivered.body.status).toBe('delivered')
		await setStatus('cancelled').expect(409)
		await setStatus('teleported').expect(400)

		const income = await api().get('/api/orders/income').set(admin.auth).expect(200)
		expect(income.body[0].total).toBe(SHOP.freeShippingFrom)
	})

	it('returns stock exactly once when an admin cancels a paid order', async () => {
		const product = await createProduct()
		const customer = await createUser({ username: 'alice' })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await placeOrder(customer.auth, orderBody(product, { quantity: 3 }))
		const setStatus = (status) =>
			api().patch(`/api/orders/${order._id}/status`).set(admin.auth).send({ status })

		await setStatus('paid').expect(200)
		const results = await Promise.all([setStatus('cancelled'), setStatus('cancelled')])

		expect(results.map((r) => r.status).sort()).toEqual([200, 409])
		expect(await stockInBlack(product)).toBe(5)
	})

	it('returns 404 for unknown orders', async () => {
		const admin = await createUser({ username: 'admin', isAdmin: true })
		await api()
			.patch('/api/orders/507f1f77bcf86cd799439011/status')
			.set(admin.auth)
			.send({ status: 'paid' })
			.expect(404)
	})
})
