import { describe, expect, it } from 'vitest'
import { api, createProduct, createUser, validAddress } from './helpers.js'

describe('/api/account/wishlist', () => {
	it('adds, lists and removes products, newest first', async () => {
		const first = await createProduct({ title: 'First' })
		const second = await createProduct({ title: 'Second' })
		const { auth } = await createUser()

		await api().put(`/api/account/wishlist/${first.id}`).set(auth).expect(200)
		const ids = await api().put(`/api/account/wishlist/${second.id}`).set(auth).expect(200)
		expect(ids.body).toEqual([first.id, second.id])

		const list = await api().get('/api/account/wishlist').set(auth).expect(200)
		expect(list.body.map((p) => p.title)).toEqual(['Second', 'First'])
		expect(list.body[0]).toHaveProperty('inStock', true)

		const afterRemove = await api().delete(`/api/account/wishlist/${first.id}`).set(auth)
		expect(afterRemove.body).toEqual([second.id])
		expect((await api().get('/api/account/wishlist/ids').set(auth)).body).toEqual([second.id])
	})

	it('is idempotent', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		await api().put(`/api/account/wishlist/${product.id}`).set(auth)
		const res = await api().put(`/api/account/wishlist/${product.id}`).set(auth).expect(200)
		expect(res.body).toEqual([product.id])
		await api().delete(`/api/account/wishlist/${product.id}`).set(auth).expect(200)
		await api().delete(`/api/account/wishlist/${product.id}`).set(auth).expect(200)
	})

	it('rejects unknown or hidden products and hides products that were hidden later', async () => {
		const hidden = await createProduct({ active: false })
		const product = await createProduct()
		const { auth } = await createUser()

		await api().put(`/api/account/wishlist/${hidden.id}`).set(auth).expect(404)
		await api().put('/api/account/wishlist/507f1f77bcf86cd799439011').set(auth).expect(404)
		await api().put('/api/account/wishlist/not-an-id').set(auth).expect(400)

		await api().put(`/api/account/wishlist/${product.id}`).set(auth).expect(200)
		product.active = false
		await product.save()
		expect((await api().get('/api/account/wishlist').set(auth)).body).toEqual([])
	})

	it('is private to each user and requires sign-in', async () => {
		const product = await createProduct()
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		await api().put(`/api/account/wishlist/${product.id}`).set(alice.auth)

		expect((await api().get('/api/account/wishlist/ids').set(bob.auth)).body).toEqual([])
		await api().get('/api/account/wishlist').expect(401)
	})
})

describe('/api/account/addresses', () => {
	const home = { ...validAddress, city: 'Warsaw' }
	const work = { ...validAddress, city: 'Krakow' }

	it('makes the first address the default and keeps exactly one default', async () => {
		const { auth } = await createUser()
		const first = await api().post('/api/account/addresses').set(auth).send(home).expect(201)
		expect(first.body).toMatchObject({ city: 'Warsaw', isDefault: true })

		const second = await api().post('/api/account/addresses').set(auth).send(work).expect(201)
		expect(second.body.isDefault).toBe(false)

		await api()
			.patch(`/api/account/addresses/${second.body._id}`)
			.set(auth)
			.send({ isDefault: true })
			.expect(200)

		const list = (await api().get('/api/account/addresses').set(auth)).body
		expect(list.map((a) => [a.city, a.isDefault])).toEqual([
			['Krakow', true],
			['Warsaw', false],
		])
	})

	it('creates a new default address when asked', async () => {
		const { auth } = await createUser()
		await api().post('/api/account/addresses').set(auth).send(home)
		await api()
			.post('/api/account/addresses')
			.set(auth)
			.send({ ...work, isDefault: true })
		const list = (await api().get('/api/account/addresses').set(auth)).body
		expect(list.filter((a) => a.isDefault).map((a) => a.city)).toEqual(['Krakow'])
	})

	it('updates fields and moves the default when the default is deleted', async () => {
		const { auth } = await createUser()
		const first = (await api().post('/api/account/addresses').set(auth).send(home)).body
		await api().post('/api/account/addresses').set(auth).send(work)

		const updated = await api()
			.patch(`/api/account/addresses/${first._id}`)
			.set(auth)
			.send({ street: 'New st. 5' })
			.expect(200)
		expect(updated.body.street).toBe('New st. 5')

		await api().delete(`/api/account/addresses/${first._id}`).set(auth).expect(204)
		const list = (await api().get('/api/account/addresses').set(auth)).body
		expect(list).toHaveLength(1)
		expect(list[0]).toMatchObject({ city: 'Krakow', isDefault: true })
	})

	it('validates input and limits the address book to 10 entries', async () => {
		const { auth } = await createUser()
		await api()
			.post('/api/account/addresses')
			.set(auth)
			.send({ ...home, city: '' })
			.expect(400)
		await api()
			.post('/api/account/addresses')
			.set(auth)
			.send({ ...home, extra: 1 })
			.expect(400)
		await api()
			.patch('/api/account/addresses/507f1f77bcf86cd799439011')
			.set(auth)
			.send({ city: 'X' })
			.expect(404)

		for (let i = 0; i < 10; i++) {
			await api().post('/api/account/addresses').set(auth).send(home).expect(201)
		}
		await api().post('/api/account/addresses').set(auth).send(home).expect(409)
	})

	it('keeps address books separate between users', async () => {
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const address = (await api().post('/api/account/addresses').set(alice.auth).send(home)).body

		expect((await api().get('/api/account/addresses').set(bob.auth)).body).toEqual([])
		await api().delete(`/api/account/addresses/${address._id}`).set(bob.auth).expect(404)
	})
})
