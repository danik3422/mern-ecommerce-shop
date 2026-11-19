import { describe, expect, it } from 'vitest'
import { api, createProduct, createUser } from './helpers.js'

describe('/api/cart', () => {
	it('returns an empty cart for a new user', async () => {
		const { auth } = await createUser()
		const res = await api().get('/api/cart').set(auth).expect(200)
		expect(res.body.items).toEqual([])
	})

	it('saves and returns the cart of the current user only', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const items = [{ productId: product.id, quantity: 2, color: 'black', size: 'M' }]

		await api().put('/api/cart').set(alice.auth).send({ items }).expect(200)

		expect((await api().get('/api/cart').set(alice.auth)).body.items).toEqual(items)
		expect((await api().get('/api/cart').set(bob.auth)).body.items).toEqual([])
	})

	it('rejects unknown products, options the product does not offer and bad quantities', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const put = (item) =>
			api()
				.put('/api/cart')
				.set(auth)
				.send({ items: [item] })

		await put({ productId: '507f1f77bcf86cd799439011', quantity: 1 }).expect(400)
		await put({ productId: product.id, quantity: 1, color: 'rainbow', size: 'M' }).expect(400)
		await put({ productId: product.id, quantity: 1.5, color: 'black', size: 'M' }).expect(400)
		await put({ productId: product.id, quantity: 0, color: 'black', size: 'M' }).expect(400)
	})

	it('clears the cart', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const items = [{ productId: product.id, quantity: 1, color: 'white', size: 'S' }]
		await api().put('/api/cart').set(auth).send({ items })

		await api().delete('/api/cart').set(auth).expect(204)
		expect((await api().get('/api/cart').set(auth)).body.items).toEqual([])
	})

	it('requires authentication', async () => {
		await api().get('/api/cart').expect(401)
	})
})
