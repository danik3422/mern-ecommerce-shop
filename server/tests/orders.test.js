import { describe, expect, it } from 'vitest'
import { Product } from '../src/models/Product.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

const orderBody = (product, overrides = {}) => ({
	items: [{ productId: product.id, quantity: 2, color: 'black', size: 'M', ...overrides }],
	address: validAddress,
})

describe('POST /api/orders', () => {
	it('calculates the amount on the server and stores a product snapshot', async () => {
		const product = await createProduct({ title: 'Coat', price: 19.99 })
		const { auth } = await createUser()

		const res = await api()
			.post('/api/orders')
			.set(auth)
			.send({ ...orderBody(product), amount: 1 })
			.expect(400) // unknown field "amount" is rejected

		expect(res.body.details[0].message).toMatch(/unrecognized/i)

		const order = await api().post('/api/orders').set(auth).send(orderBody(product)).expect(201)
		expect(order.body).toMatchObject({ subtotal: 39.98, shipping: 4.9, amount: 44.88 })
		expect(order.body.items[0]).toMatchObject({ title: 'Coat', price: 19.99, quantity: 2 })
		expect(order.body.status).toBe('pending')
	})

	it('keeps the original price when the product price changes later', async () => {
		const product = await createProduct({ price: 10 })
		const { auth } = await createUser()
		await api().post('/api/orders').set(auth).send(orderBody(product)).expect(201)

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
		expect(soldOut.body.details[0].message).toMatch(/sold out in size S/)

		const notEnough = await api().post('/api/orders').set(auth).send(orderBody(product)).expect(409)
		expect(notEnough.body.details[0].message).toMatch(/Only 1 left/)
	})

	it('rejects options the product does not offer', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		await api()
			.post('/api/orders')
			.set(auth)
			.send(orderBody(product, { color: 'rainbow' }))
			.expect(400)
		await api()
			.post('/api/orders')
			.set(auth)
			.send(orderBody(product, { size: 'XXXL' }))
			.expect(400)
		await api()
			.post('/api/orders')
			.set(auth)
			.send(orderBody(product, { size: undefined }))
			.expect(400)
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

		await api().post('/api/orders').set(auth).send(body).expect(201)
		expect((await api().get('/api/cart').set(auth)).body.items).toEqual([])
	})
})

describe('order management', () => {
	it('shows users only their own orders', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		await api().post('/api/orders').set(alice.auth).send(orderBody(product)).expect(201)

		expect((await api().get('/api/orders/mine').set(alice.auth)).body).toHaveLength(1)
		expect((await api().get('/api/orders/mine').set(bob.auth)).body).toHaveLength(0)
		await api().get('/api/orders').set(bob.auth).expect(403)
	})

	it('lets admins list orders, change status and see income', async () => {
		const product = await createProduct({ price: 25 })
		const customer = await createUser({ username: 'alice' })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await api().post('/api/orders').set(customer.auth).send(orderBody(product))

		expect((await api().get('/api/orders').set(admin.auth)).body).toHaveLength(1)

		const updated = await api()
			.patch(`/api/orders/${order.body._id}/status`)
			.set(admin.auth)
			.send({ status: 'shipped' })
			.expect(200)
		expect(updated.body.status).toBe('shipped')

		await api()
			.patch(`/api/orders/${order.body._id}/status`)
			.set(admin.auth)
			.send({ status: 'teleported' })
			.expect(400)

		const income = await api().get('/api/orders/income').set(admin.auth).expect(200)
		expect(income.body[0].total).toBe(50) // free shipping from 50
	})
})
