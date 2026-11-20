import { beforeEach, describe, expect, it } from 'vitest'
import { api, createProduct, createUser } from './helpers.js'

const titles = (res) => res.body.items.map((p) => p.title)

describe('GET /api/products', () => {
	beforeEach(async () => {
		await createProduct({ title: 'Cheap tee', price: 5, categories: ['women'], colors: ['white'] })
		await createProduct({
			title: 'Coat',
			price: 100,
			categories: ['coats'],
			colors: ['black'],
			sizes: [{ label: 'L', stock: 1 }],
		})
		await createProduct({
			title: 'Jeans',
			price: 50,
			categories: ['jeans', 'women'],
			colors: ['blue'],
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
		await api().get('/api/products?minPrice=50&maxPrice=10').expect(400)
		await api().get('/api/products?onSale=yes').expect(400)
	})

	it('does not list hidden products', async () => {
		await createProduct({ title: 'Hidden', active: false })
		expect(titles(await api().get('/api/products'))).not.toContain('Hidden')
	})
})

describe('GET /api/products — search and facets filters', () => {
	beforeEach(async () => {
		await createProduct({
			title: 'Linen Shirt',
			brand: 'Northline',
			price: 40,
			compareAtPrice: 80,
			colors: ['white'],
			sizes: [
				{ label: 'S', stock: 0 },
				{ label: 'M', stock: 3 },
			],
		})
		await createProduct({
			title: 'Wool Coat',
			brand: 'Aster & Co',
			description: 'Warm (and) heavy',
			price: 150,
			compareAtPrice: 160,
			colors: ['black'],
			sizes: [{ label: 'L', stock: 0 }],
		})
		await createProduct({
			title: 'Denim Jacket',
			brand: 'Indigo Works',
			price: 90,
			colors: ['blue', 'black'],
			sizes: [{ label: 'M', stock: 5 }],
		})
	})

	it('searches title, brand and description case-insensitively', async () => {
		expect(titles(await api().get('/api/products?q=shirt'))).toEqual(['Linen Shirt'])
		expect(titles(await api().get('/api/products?q=INDIGO'))).toEqual(['Denim Jacket'])
		expect(titles(await api().get('/api/products?q=warm'))).toEqual(['Wool Coat'])
	})

	it('treats search input as plain text, not as a regular expression', async () => {
		expect(titles(await api().get('/api/products?q=(and)'))).toEqual(['Wool Coat'])
		expect(titles(await api().get(`/api/products?q=${encodeURIComponent('.*')}`))).toEqual([])
		await api()
			.get(`/api/products?q=${encodeURIComponent('[')}`)
			.expect(200)
	})

	it('filters by several brands, colors and sizes', async () => {
		const brands = encodeURIComponent('Northline,Aster & Co')
		expect(titles(await api().get(`/api/products?brand=${brands}&sort=price_asc`))).toEqual([
			'Linen Shirt',
			'Wool Coat',
		])
		expect(titles(await api().get('/api/products?color=white,blue&sort=price_asc'))).toEqual([
			'Linen Shirt',
			'Denim Jacket',
		])
		expect(titles(await api().get('/api/products?size=L'))).toEqual(['Wool Coat'])
	})

	it('filters by price range, sale and stock', async () => {
		expect(titles(await api().get('/api/products?minPrice=50&maxPrice=100'))).toEqual([
			'Denim Jacket',
		])
		expect(titles(await api().get('/api/products?onSale=true&sort=price_asc'))).toEqual([
			'Linen Shirt',
			'Wool Coat',
		])
		expect(titles(await api().get('/api/products?inStock=true&sort=price_asc'))).toEqual([
			'Linen Shirt',
			'Denim Jacket',
		])
		// size S of the shirt is sold out, M is not
		expect(titles(await api().get('/api/products?inStock=true&size=S'))).toEqual([])
		expect(titles(await api().get('/api/products?inStock=true&size=M&sort=price_asc'))).toEqual([
			'Linen Shirt',
			'Denim Jacket',
		])
	})

	it('sorts by discount and by rating', async () => {
		expect(titles(await api().get('/api/products?sort=discount'))).toEqual([
			'Linen Shirt',
			'Wool Coat',
			'Denim Jacket',
		])

		await createProduct({ title: 'Loved', rating: { average: 4.8, count: 10 } })
		const [first] = titles(await api().get('/api/products?sort=rating'))
		expect(first).toBe('Loved')
	})
})

describe('GET /api/products/facets', () => {
	it('returns brands, colors, sizes and price range for the scope', async () => {
		await createProduct({
			brand: 'Northline',
			price: 20,
			colors: ['white'],
			sizes: [
				{ label: 'XL', stock: 1 },
				{ label: 'S', stock: 1 },
			],
		})
		await createProduct({
			brand: 'Northline',
			price: 80,
			colors: ['white', 'black'],
			sizes: [
				{ label: '32', stock: 1 },
				{ label: 'One size', stock: 1 },
				{ label: 'M', stock: 1 },
			],
		})
		await createProduct({ brand: 'Other', price: 500, categories: ['coats'] })

		const res = await api().get('/api/products/facets?category=women').expect(200)

		expect(res.body.brands).toEqual([{ value: 'Northline', count: 2 }])
		expect(res.body.colors).toEqual([
			{ value: 'black', count: 1 },
			{ value: 'white', count: 2 },
		])
		expect(res.body.sizes.map((s) => s.value)).toEqual(['S', 'M', 'XL', '32', 'One size'])
		expect(res.body.price).toEqual({ min: 20, max: 80 })
	})

	it('narrows facets by search and handles an empty result', async () => {
		await createProduct({ title: 'Linen Shirt', brand: 'Northline' })
		await createProduct({ title: 'Wool Coat', brand: 'Aster' })

		const shirts = await api().get('/api/products/facets?q=linen').expect(200)
		expect(shirts.body.brands).toEqual([{ value: 'Northline', count: 1 }])

		const none = await api().get('/api/products/facets?q=nothing-matches').expect(200)
		expect(none.body).toEqual({ brands: [], colors: [], sizes: [], price: { min: 0, max: 0 } })
	})
})

describe('GET /api/products/:id/related', () => {
	it('returns other active products from the same categories', async () => {
		const coat = await createProduct({ title: 'Coat', slug: 'coat', categories: ['coats'] })
		await createProduct({ title: 'Parka', categories: ['coats', 'winter'] })
		await createProduct({ title: 'Hidden coat', categories: ['coats'], active: false })
		await createProduct({ title: 'Tee', categories: ['tshirts'] })

		const bySlug = await api().get('/api/products/coat/related').expect(200)
		expect(bySlug.body.map((p) => p.title)).toEqual(['Parka'])
		expect(bySlug.body[0]).toHaveProperty('inStock', true)

		const byId = await api().get(`/api/products/${coat.id}/related?limit=1`).expect(200)
		expect(byId.body).toHaveLength(1)
	})

	it('returns 404 for an unknown product and validates the limit', async () => {
		await api().get('/api/products/nope/related').expect(404)
		await createProduct({ slug: 'tee' })
		await api().get('/api/products/tee/related?limit=50').expect(400)
	})
})

describe('GET /api/products/:id', () => {
	it('returns a product', async () => {
		const product = await createProduct({ title: 'Coat' })
		const res = await api().get(`/api/products/${product.id}`).expect(200)
		expect(res.body.title).toBe('Coat')
	})

	it('finds a product by slug', async () => {
		await createProduct({ title: 'Coat', slug: 'warm-coat' })
		const res = await api().get('/api/products/warm-coat').expect(200)
		expect(res.body).toMatchObject({ title: 'Coat', inStock: true, onSale: false })
	})

	it('returns 404 for a missing or hidden product', async () => {
		const hidden = await createProduct({ active: false })
		await api().get('/api/products/no-such-slug').expect(404)
		await api().get('/api/products/507f1f77bcf86cd799439011').expect(404)
		await api().get(`/api/products/${hidden.id}`).expect(404)
	})

	it('computes stock and discount fields', async () => {
		const product = await createProduct({
			price: 75,
			compareAtPrice: 100,
			sizes: [{ label: 'M', stock: 0 }],
		})
		const res = await api().get(`/api/products/${product.id}`)
		expect(res.body).toMatchObject({ inStock: false, onSale: true, discountPercent: 25 })
	})
})

describe('product management', () => {
	const newProduct = {
		title: 'New coat',
		slug: 'new-coat',
		brand: 'Aster',
		description: 'Warm',
		categories: ['Coats'],
		variants: [
			{
				color: 'Black',
				images: ['https://example.com/coat.png'],
				sizes: [{ label: 'M', stock: 3 }],
			},
		],
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
			.send({ ...newProduct, variants: [{ ...newProduct.variants[0], images: ['not a url'] }] })
			.expect(400)
	})

	it('accepts local image paths served by the client but not arbitrary strings', async () => {
		const { auth } = await createUser({ isAdmin: true })
		const create = (img) =>
			api()
				.post('/api/products')
				.set(auth)
				.send({
					...newProduct,
					slug: `local-${Date.now()}`,
					variants: [{ ...newProduct.variants[0], images: [img] }],
				})

		await create('/images/products/coat.jpg').expect(201)
		await create('/images/<script>.jpg').expect(400)
	})
})
