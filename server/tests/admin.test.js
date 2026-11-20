import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Review } from '../src/models/Review.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

// Uploads go to a temporary directory; set before src/config/env.js is loaded.
const uploadDir = vi.hoisted(() => {
	const dir = `${process.env.TMPDIR ?? '/tmp'}/shop-admin-uploads-${process.pid}-${Date.now()}`
	process.env.UPLOAD_DIR = dir
	return dir
})

afterAll(() => rm(uploadDir, { recursive: true, force: true }))

// smallest valid PNG: 1x1 transparent pixel
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64',
)

const createOrder = (user, product, overrides = {}) =>
	Order.create({
		user: user._id,
		items: [
			{
				productId: product._id,
				quantity: 2,
				size: 'M',
				title: product.title,
				brand: product.brand,
				image: product.variants[0].images[0],
				price: product.price,
			},
		],
		subtotal: product.price * 2,
		shipping: 0,
		amount: product.price * 2,
		address: validAddress,
		...overrides,
	})

let admin

beforeEach(async () => {
	admin = await createUser({ username: 'admin', isAdmin: true })
})

describe('admin access', () => {
	it.each(['/stats', '/products', '/orders', '/reviews'])(
		'GET /api/admin%s needs an admin',
		async (route) => {
			const customer = await createUser({ username: 'customer' })
			await api().get(`/api/admin${route}`).expect(401)
			await api().get(`/api/admin${route}`).set(customer.auth).expect(403)
			await api().get(`/api/admin${route}`).set(admin.auth).expect(200)
		},
	)

	it('rejects uploads from regular users', async () => {
		const customer = await createUser({ username: 'customer' })
		await api()
			.post('/api/admin/uploads')
			.set(customer.auth)
			.attach('image', PNG, 'pixel.png')
			.expect(403)
	})
})

describe('GET /api/admin/stats', () => {
	it('summarises revenue, orders, customers, stock and best sellers', async () => {
		const customer = await createUser({ username: 'customer' })
		const coat = await createProduct({
			title: 'Coat',
			price: 50,
			colors: ['black'],
			sizes: [
				{ label: 'M', stock: 1 },
				{ label: 'L', stock: 20 },
			],
		})
		await createProduct({ active: false })
		await createOrder(customer.user, coat)
		await createOrder(customer.user, coat, { status: 'paid' })
		await createOrder(customer.user, coat, { status: 'cancelled' })

		const { body } = await api().get('/api/admin/stats').set(admin.auth).expect(200)

		expect(body.revenue).toBe(200) // cancelled orders are not counted
		expect(body.orders).toBe(3)
		expect(body.ordersByStatus).toMatchObject({ pending: 1, paid: 1, cancelled: 1, shipped: 0 })
		expect(body.customers).toBe(1)
		expect(body.products).toEqual({ total: 2, active: 1 })
		expect(body.lowStock).toEqual([
			expect.objectContaining({ title: 'Coat', color: 'black', size: 'M', stock: 1 }),
		])
		expect(body.topProducts[0]).toMatchObject({ title: 'Coat', quantity: 4, revenue: 200 })
		expect(body.recentOrders).toHaveLength(3)
		expect(body.recentOrders[0].user.username).toBe('customer')
	})

	it('returns revenue for each of the last 30 days', async () => {
		const customer = await createUser({ username: 'customer' })
		await createOrder(customer.user, await createProduct({ price: 30 }))

		const { body } = await api().get('/api/admin/stats').set(admin.auth)

		expect(body.revenuePerDay).toHaveLength(30)
		expect(body.revenuePerDay.at(-1)).toEqual({
			date: new Date().toISOString().slice(0, 10),
			total: 60,
			orders: 1,
		})
		expect(body.revenuePerDay[0]).toMatchObject({ total: 0, orders: 0 })
	})
})

describe('GET /api/admin/products', () => {
	beforeEach(async () => {
		await createProduct({ title: 'Wool Coat', brand: 'Aster' })
		await createProduct({ title: 'Hidden Tee', active: false })
		await createProduct({ title: 'Last Jeans', sizes: [{ label: '30', stock: 0 }] })
	})

	const titles = (res) => res.body.items.map((p) => p.title).sort()

	it('includes hidden products', async () => {
		const res = await api().get('/api/admin/products').set(admin.auth).expect(200)
		expect(res.body.total).toBe(3)
		expect(res.body.items[0]).toHaveProperty('inStock')
	})

	it('filters by search, status and low stock', async () => {
		const get = (query) => api().get(`/api/admin/products?${query}`).set(admin.auth)

		expect(titles(await get('q=aster'))).toEqual(['Wool Coat'])
		expect(titles(await get('q=(.*'))).toEqual([]) // regex characters are escaped
		expect(titles(await get('status=hidden'))).toEqual(['Hidden Tee'])
		expect(titles(await get('status=active'))).toEqual(['Last Jeans', 'Wool Coat'])
		expect(titles(await get('lowStock=true'))).toEqual(['Last Jeans'])
	})

	it('validates the query', async () => {
		await api().get('/api/admin/products?status=deleted').set(admin.auth).expect(400)
		await api().get('/api/admin/products?limit=500').set(admin.auth).expect(400)
	})

	it('returns a hidden product by id', async () => {
		const hidden = await createProduct({ title: 'Secret', active: false })
		const res = await api().get(`/api/admin/products/${hidden.id}`).set(admin.auth).expect(200)
		expect(res.body.title).toBe('Secret')
		await api().get('/api/admin/products/507f1f77bcf86cd799439011').set(admin.auth).expect(404)
		await api().get('/api/admin/products/nope').set(admin.auth).expect(400)
	})
})

describe('GET /api/admin/orders', () => {
	it('filters by status and finds orders by customer or id', async () => {
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const product = await createProduct()
		const aliceOrder = await createOrder(alice.user, product, { status: 'paid' })
		await createOrder(bob.user, product)

		const get = (query) => api().get(`/api/admin/orders?${query}`).set(admin.auth)

		const all = await get('')
		expect(all.body.total).toBe(2)
		expect(all.body.items[0].user).toMatchObject({ username: 'bob', email: 'bob@example.com' })

		expect((await get('status=paid')).body.items).toHaveLength(1)
		expect((await get('q=ALICE@example')).body.items[0]._id).toBe(aliceOrder.id)
		expect((await get(`q=${aliceOrder.id}`)).body.items[0]._id).toBe(aliceOrder.id)
		expect((await get('q=nobody')).body.items).toEqual([])
		await get('status=lost').expect(400)
	})
})

describe('GET /api/admin/orders/:id', () => {
	it('returns an order with its customer', async () => {
		const alice = await createUser({ username: 'alice' })
		const order = await createOrder(alice.user, await createProduct())

		const res = await api().get(`/api/admin/orders/${order.id}`).set(admin.auth).expect(200)
		expect(res.body.user).toMatchObject({ username: 'alice' })
		expect(res.body.address).toMatchObject(validAddress)

		await api().get('/api/admin/orders/507f1f77bcf86cd799439011').set(admin.auth).expect(404)
		await api().get(`/api/admin/orders/${order.id}`).set(alice.auth).expect(403)
	})
})

describe('GET /api/admin/reviews', () => {
	it('lists the newest reviews with their product', async () => {
		const product = await createProduct({ title: 'Coat', slug: 'coat' })
		await Review.create({
			product: product._id,
			user: admin.user._id,
			username: 'admin',
			rating: 4,
			body: 'Warm and nice',
		})

		const res = await api().get('/api/admin/reviews').set(admin.auth).expect(200)
		expect(res.body.total).toBe(1)
		expect(res.body.items[0]).toMatchObject({
			rating: 4,
			body: 'Warm and nice',
			product: { title: 'Coat', slug: 'coat' },
		})
	})
})

describe('POST /api/admin/uploads', () => {
	const upload = () => api().post('/api/admin/uploads').set(admin.auth)

	it('stores a real image under a random name and serves it', async () => {
		const res = await upload().attach('image', PNG, 'my photo.png').expect(201)

		expect(res.body.url).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/)
		expect(existsSync(path.join(uploadDir, path.basename(res.body.url)))).toBe(true)

		const served = await api().get(res.body.url).expect(200)
		expect(served.headers['content-type']).toBe('image/png')
	})

	it('rejects files that only pretend to be images', async () => {
		const fake = Buffer.from('<?php echo "hi"; ?> just some text pretending to be png')
		const res = await upload()
			.attach('image', fake, { filename: 'evil.png', contentType: 'image/png' })
			.expect(400)
		expect(res.body.message).toMatch(/JPEG, PNG and WebP/)
	})

	it('rejects a missing file, a wrong field and files over 5 MB', async () => {
		await upload().expect(400)
		await upload().attach('photo', PNG, 'pixel.png').expect(400)

		const huge = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
		await upload().attach('image', huge, 'huge.png').expect(413)
	})

	it('writes only accepted files', async () => {
		const before = existsSync(uploadDir) ? await readdir(uploadDir) : []
		await upload().attach('image', Buffer.from('nope nope nope'), 'x.jpg').expect(400)
		const after = existsSync(uploadDir) ? await readdir(uploadDir) : []
		expect(after).toEqual(before)
	})
})
