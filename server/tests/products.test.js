import { beforeEach, describe, expect, it } from 'vitest'
import { api, createProduct, createUser } from './helpers.js'

const titles = (res) => res.body.items.map((p) => p.title)

describe('GET /api/products', () => {
	beforeEach(async () => {
		await createProduct({ title: 'Cheap tee', price: 5, categories: ['women'], color: ['white'] })
		await createProduct({
			title: 'Coat',
			price: 100,
			categories: ['coats'],
			color: ['black'],
			size: ['L'],
		})
		await createProduct({
			title: 'Jeans',
			price: 50,
			categories: ['jeans', 'women'],
			color: ['blue'],
		})
	})

	it('is public and paginated', async () => {
		const res = await api().get('/api/products?limit=2').expect(200)
		expect(res.body).toMatchObject({ page: 1, pages: 2, total: 3 })
		expect(res.body.items).toHaveLength(2)
	})

	it('filters by category, color and size', async () => {
		expect(titles(await api().get('/api/products?category=women&sort=price_asc'))).toEqual([
			'Cheap tee',
			'Jeans',
		])
		expect(titles(await api().get('/api/products?color=Black'))).toEqual(['Coat'])
		expect(titles(await api().get('/api/products?size=L'))).toEqual(['Coat'])
	})

	it('sorts by price', async () => {
		const res = await api().get('/api/products?sort=price_desc')
		expect(titles(res)).toEqual(['Coat', 'Jeans', 'Cheap tee'])
	})

	it('loads specific products by ids', async () => {
		const all = await api().get('/api/products')
		const [first, second] = all.body.items
		const res = await api().get(`/api/products?ids=${first._id},${second._id}`)
		expect(titles(res).sort()).toEqual([first.title, second.title].sort())
	})

	it('validates query parameters', async () => {
		await api().get('/api/products?sort=random').expect(400)
		await api().get('/api/products?limit=1000').expect(400)
		await api().get('/api/products?ids=not-an-id').expect(400)
	})
})

describe('GET /api/products/:id', () => {
	it('returns a product', async () => {
		const product = await createProduct({ title: 'Coat' })
		const res = await api().get(`/api/products/${product.id}`).expect(200)
		expect(res.body.title).toBe('Coat')
	})

	it('returns 400 for a malformed id and 404 for a missing product', async () => {
		await api().get('/api/products/xyz').expect(400)
		await api().get('/api/products/507f1f77bcf86cd799439011').expect(404)
	})
})

describe('product management', () => {
	const newProduct = {
		title: 'New coat',
		description: 'Warm',
		img: 'https://example.com/coat.png',
		categories: ['Coats'],
		price: 120,
	}

	it('lets admins create, update and delete products', async () => {
		const { auth } = await createUser({ isAdmin: true })

		const created = await api().post('/api/products').set(auth).send(newProduct).expect(201)
		expect(created.body.categories).toEqual(['coats'])

		const id = created.body._id
		const updated = await api()
			.patch(`/api/products/${id}`)
			.set(auth)
			.send({ price: 99 })
			.expect(200)
		expect(updated.body.price).toBe(99)

		await api().delete(`/api/products/${id}`).set(auth).expect(204)
		await api().get(`/api/products/${id}`).expect(404)
	})

	it('forbids regular users and anonymous visitors', async () => {
		const { auth } = await createUser()
		await api().post('/api/products').set(auth).send(newProduct).expect(403)
		await api().post('/api/products').send(newProduct).expect(401)
	})

	it('validates product data', async () => {
		const { auth } = await createUser({ isAdmin: true })
		await api()
			.post('/api/products')
			.set(auth)
			.send({ ...newProduct, price: -1 })
			.expect(400)
		await api()
			.post('/api/products')
			.set(auth)
			.send({ ...newProduct, img: 'not a url' })
			.expect(400)
	})

	it('accepts local image paths served by the client but not arbitrary strings', async () => {
		const { auth } = await createUser({ isAdmin: true })
		const create = (img) =>
			api()
				.post('/api/products')
				.set(auth)
				.send({ ...newProduct, img })

		await create('/images/products/coat.jpg').expect(201)
		await create('/images/<script>.jpg').expect(400)
	})
})
