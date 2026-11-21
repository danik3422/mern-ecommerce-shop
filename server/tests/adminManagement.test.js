import { beforeEach, describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { Review } from '../src/models/Review.js'
import { User } from '../src/models/User.js'
import { discountedPrices } from '../src/services/adminProducts.js'
import { DEFAULT_PASSWORD, api, createProduct, createUser, validAddress } from './helpers.js'

let admin

beforeEach(async () => {
	admin = await createUser({ username: 'admin', isAdmin: true })
})

const createOrder = (user, overrides = {}) =>
	Order.create({
		user: user?._id,
		email: user?.email ?? 'guest@example.com',
		items: [
			{
				productId: '6a0000000000000000000001',
				quantity: 1,
				size: 'M',
				title: 'Coat',
				brand: 'Aster',
				image: '/images/products/coat.jpg',
				price: 100,
			},
		],
		subtotal: 100,
		shipping: 0,
		amount: 100,
		address: validAddress,
		...overrides,
	})

describe('GET /api/admin/products filters and sorting', () => {
	const titles = (res) => res.body.items.map((p) => p.title)
	const get = (query) =>
		api().get(`/api/admin/products?${query}`).set(admin.auth).expect(200).then(titles)

	beforeEach(async () => {
		await createProduct({ title: 'b Coat', brand: 'Aster', categories: ['coats'], price: 300 })
		await createProduct({
			title: 'a Tee',
			brand: 'Northline',
			price: 50,
			compareAtPrice: 80,
			sizes: [{ label: 'M', stock: 2 }],
		})
		await createProduct({
			title: 'C Jeans',
			brand: 'Northline',
			price: 120,
			active: false,
			sizes: [{ label: '30', stock: 0 }],
		})
	})

	it('filters by category, brand, sale, stock and visibility', async () => {
		expect(await get('category=coats')).toEqual(['b Coat'])
		expect((await get('brand=Northline')).sort()).toEqual(['C Jeans', 'a Tee'])
		expect(await get('onSale=true')).toEqual(['a Tee'])
		expect((await get('onSale=false')).sort()).toEqual(['C Jeans', 'b Coat'])
		expect((await get('stock=low')).sort()).toEqual(['C Jeans', 'a Tee'])
		expect(await get('stock=out')).toEqual(['C Jeans'])
		expect(await get('status=hidden')).toEqual(['C Jeans'])
	})

	it('sorts by title (ignoring case), price and stock', async () => {
		expect(await get('sort=title_asc')).toEqual(['a Tee', 'b Coat', 'C Jeans'])
		expect(await get('sort=price_desc')).toEqual(['b Coat', 'C Jeans', 'a Tee'])
		// stock: coat 20 (2 colors x 2 sizes x 5), tee 4, jeans 0
		expect(await get('sort=stock_asc')).toEqual(['C Jeans', 'a Tee', 'b Coat'])
	})

	it('rejects unknown sorts and stock filters', async () => {
		await api().get('/api/admin/products?sort=random').set(admin.auth).expect(400)
		await api().get('/api/admin/products?stock=some').set(admin.auth).expect(400)
	})

	it('lists brands and categories for the filters', async () => {
		const { body } = await api().get('/api/admin/products/filters').set(admin.auth).expect(200)
		expect(body).toEqual({ brands: ['Aster', 'Northline'], categories: ['coats', 'women'] })
	})
})

describe('POST /api/admin/products/:id/duplicate', () => {
	it('creates a hidden copy with a free slug and without reviews', async () => {
		const original = await createProduct({ title: 'Coat', slug: 'coat', price: 99 })
		await Product.updateOne({ _id: original._id }, { rating: { average: 5, count: 3 } })

		const first = await api()
			.post(`/api/admin/products/${original._id}/duplicate`)
			.set(admin.auth)
			.expect(201)
		expect(first.body).toMatchObject({
			title: 'Coat (copy)',
			slug: 'coat-copy',
			active: false,
			price: 99,
			rating: { average: 0, count: 0 },
		})
		expect(first.body.variants).toEqual(JSON.parse(JSON.stringify(original.variants)))
		expect(first.body._id).not.toBe(String(original._id))

		const second = await api()
			.post(`/api/admin/products/${original._id}/duplicate`)
			.set(admin.auth)
			.expect(201)
		expect(second.body.slug).toBe('coat-copy-2')

		// copying a copy does not pile up suffixes
		const third = await api()
			.post(`/api/admin/products/${first.body._id}/duplicate`)
			.set(admin.auth)
			.expect(201)
		expect(third.body.slug).toBe('coat-copy-3')
	})

	it('returns 404 for an unknown product and 403 for customers', async () => {
		const customer = await createUser({ username: 'customer' })
		const product = await createProduct()
		await api()
			.post('/api/admin/products/6a0000000000000000000001/duplicate')
			.set(admin.auth)
			.expect(404)
		await api().post(`/api/admin/products/${product._id}/duplicate`).set(customer.auth).expect(403)
	})
})

describe('discountedPrices', () => {
	it('takes the discount off the regular price, never compounding', () => {
		expect(discountedPrices({ price: 100 }, 20)).toEqual({ price: 80, compareAtPrice: 100 })
		// already on sale: the compare-at price is the regular one
		expect(discountedPrices({ price: 80, compareAtPrice: 100 }, 30)).toEqual({
			price: 70,
			compareAtPrice: 100,
		})
		expect(discountedPrices({ price: 99.99 }, 15)).toEqual({ price: 84.99, compareAtPrice: 99.99 })
	})

	it('ends the sale at 0% and ignores no-op changes', () => {
		expect(discountedPrices({ price: 80, compareAtPrice: 100 }, 0)).toEqual({
			price: 100,
			compareAtPrice: null,
		})
		expect(discountedPrices({ price: 100 }, 0)).toBeNull()
		expect(discountedPrices({ price: 80, compareAtPrice: 100 }, 20)).toBeNull()
		// a stale compare-at price below the price is not a sale
		expect(discountedPrices({ price: 100, compareAtPrice: 90 }, 10)).toEqual({
			price: 90,
			compareAtPrice: 100,
		})
		// free products cannot be discounted
		expect(discountedPrices({ price: 0 }, 50)).toBeNull()
	})
})

describe('POST /api/admin/products/bulk', () => {
	let a
	let b
	const bulk = (body) => api().post('/api/admin/products/bulk').set(admin.auth).send(body)
	const stored = (product) => Product.findById(product._id).lean()

	beforeEach(async () => {
		a = await createProduct({ price: 100 })
		b = await createProduct({ price: 40, compareAtPrice: 50, active: false })
	})

	it('shows and hides products', async () => {
		const ids = [String(a._id), String(b._id)]
		expect((await bulk({ ids, action: 'hide' }).expect(200)).body).toEqual({
			matched: 2,
			modified: 1,
		})
		expect((await stored(a)).active).toBe(false)

		await bulk({ ids, action: 'show' }).expect(200)
		expect((await stored(a)).active).toBe(true)
		expect((await stored(b)).active).toBe(true)
	})

	it('deletes products', async () => {
		const res = await bulk({ ids: [String(a._id)], action: 'delete' }).expect(200)
		expect(res.body).toEqual({ matched: 1, modified: 1 })
		expect(await Product.countDocuments()).toBe(1)
	})

	it('sets and removes a discount with valid prices', async () => {
		const ids = [String(a._id), String(b._id)]
		await bulk({ ids, action: 'discount', percent: 25 }).expect(200)
		expect(await stored(a)).toMatchObject({ price: 75, compareAtPrice: 100 })
		expect(await stored(b)).toMatchObject({ price: 37.5, compareAtPrice: 50 })

		await bulk({ ids, action: 'discount', percent: 0 }).expect(200)
		const [plainA, plainB] = await Promise.all([stored(a), stored(b)])
		expect(plainA.price).toBe(100)
		expect(plainA).not.toHaveProperty('compareAtPrice')
		expect(plainB.price).toBe(50)
		expect(plainB).not.toHaveProperty('compareAtPrice')
	})

	it('validates the body', async () => {
		await bulk({ ids: [], action: 'hide' }).expect(400)
		await bulk({ ids: ['nope'], action: 'hide' }).expect(400)
		await bulk({ ids: [String(a._id)], action: 'archive' }).expect(400)
		const missing = await bulk({ ids: [String(a._id)], action: 'discount' }).expect(400)
		expect(missing.body.details[0].path).toBe('percent')
		await bulk({ ids: [String(a._id)], action: 'discount', percent: 95 }).expect(400)
	})

	it('is only for admins', async () => {
		const customer = await createUser({ username: 'customer' })
		await api()
			.post('/api/admin/products/bulk')
			.set(customer.auth)
			.send({ ids: [String(a._id)], action: 'delete' })
			.expect(403)
		expect(await Product.countDocuments()).toBe(2)
	})
})

describe('admin customers', () => {
	let alice

	beforeEach(async () => {
		alice = await createUser({ username: 'alice' })
		await createUser({ username: 'bob' })
		await createOrder(alice.user, { status: 'delivered', amount: 120 })
		await createOrder(alice.user, {
			status: 'delivered',
			amount: 80,
			returnRequest: { status: 'refunded', reason: 'too_small', refundAmount: 30, items: [] },
		})
		await createOrder(alice.user, { status: 'pending', amount: 500 })
		await createOrder(alice.user, { status: 'cancelled', amount: 500 })
	})

	it('lists shoppers (never staff) with orders and total spent, sorted and searchable', async () => {
		const { body } = await api().get('/api/admin/customers?sort=spent').set(admin.auth).expect(200)
		expect(body.items.map((u) => u.username)).toEqual(['alice', 'bob'])
		// paid orders minus refunded returns: 120 + 80 - 30
		expect(body.items[0]).toMatchObject({ username: 'alice', orders: 4, totalSpent: 170 })
		expect(body.items[0]).not.toHaveProperty('passwordHash')
		expect(body.items[0]).toHaveProperty('lastLoginAt')

		const search = await api().get('/api/admin/customers?q=BOB').set(admin.auth).expect(200)
		expect(search.body.items.map((u) => u.username)).toEqual(['bob'])
		const staff = await api().get('/api/admin/customers?q=admin').set(admin.auth).expect(200)
		expect(staff.body.total).toBe(0)
	})

	it('records the last sign-in', async () => {
		await api().post('/api/auth/login').send({ login: 'bob', password: DEFAULT_PASSWORD })
		const { body } = await api().get('/api/admin/customers?q=bob').set(admin.auth)
		expect(new Date(body.items[0].lastLoginAt).getTime()).toBeGreaterThan(Date.now() - 60_000)
	})

	it('returns a customer with orders, totals and reviews count', async () => {
		await Review.create({
			product: '6a0000000000000000000001',
			user: alice.user._id,
			username: 'alice',
			rating: 5,
			body: 'Great',
		})
		const { body } = await api()
			.get(`/api/admin/customers/${alice.user._id}`)
			.set(admin.auth)
			.expect(200)

		expect(body).toMatchObject({
			username: 'alice',
			reviews: 1,
			stats: { orders: 4, totalSpent: 170 },
		})
		expect(body.orders).toHaveLength(4)
		expect(body.orders[0]).toHaveProperty('itemCount', 1)
		expect(body).not.toHaveProperty('passwordHash')
		await api().get('/api/admin/customers/6a0000000000000000000001').set(admin.auth).expect(404)
	})

	it('blocks and unblocks shoppers only; promoting them is not possible', async () => {
		const res = await api()
			.patch(`/api/admin/customers/${alice.user._id}`)
			.set(admin.auth)
			.send({ blocked: true })
			.expect(200)
		expect(res.body).toMatchObject({ blocked: true, role: 'customer', isAdmin: false })

		await api()
			.patch(`/api/admin/customers/${alice.user._id}`)
			.set(admin.auth)
			.send({ isAdmin: true })
			.expect(400)
		// staff accounts are not customers
		await api()
			.patch(`/api/admin/customers/${admin.user._id}`)
			.set(admin.auth)
			.send({ blocked: true })
			.expect(404)
		await api().get(`/api/admin/customers/${admin.user._id}`).set(admin.auth).expect(404)
	})
})

describe('blocked accounts', () => {
	it('cannot sign in, and their sessions stop working', async () => {
		const alice = await createUser({ username: 'alice' })
		await api().get('/api/users/me').set(alice.auth).expect(200)

		await api()
			.patch(`/api/admin/customers/${alice.user._id}`)
			.set(admin.auth)
			.send({ blocked: true })
			.expect(200)

		const login = await api()
			.post('/api/auth/login')
			.send({ login: 'alice', password: DEFAULT_PASSWORD })
			.expect(403)
		expect(login.body.message).toMatch(/blocked/i)
		// a wrong password still gets the usual answer, so blocking reveals nothing
		await api().post('/api/auth/login').send({ login: 'alice', password: 'wrong-pass' }).expect(401)
		await api().get('/api/users/me').set(alice.auth).expect(401)

		await User.updateOne({ _id: alice.user._id }, { blocked: false })
		await api()
			.post('/api/auth/login')
			.send({ login: 'alice', password: DEFAULT_PASSWORD })
			.expect(200)
		await api().get('/api/users/me').set(alice.auth).expect(200)
	})
})

describe('admin orders', () => {
	it('filters by date range and finds orders by number or name on the address', async () => {
		const customer = await createUser({ username: 'customer' })
		const old = await createOrder(customer.user)
		// the driver directly: Mongoose does not let updates change timestamps
		await Order.collection.updateOne(
			{ _id: old._id },
			{ $set: { createdAt: new Date('2026-01-10T12:00:00Z') } },
		)
		const guest = await createOrder(null, {
			address: { ...validAddress, fullName: 'Zofia Nowak' },
		})

		const ids = async (query) =>
			(await api().get(`/api/admin/orders?${query}`).set(admin.auth).expect(200)).body.items.map(
				(order) => order._id,
			)

		expect(await ids('from=2026-01-10&to=2026-01-10')).toEqual([String(old._id)])
		expect(await ids('to=2026-01-09')).toEqual([])
		expect(await ids('q=nowak')).toEqual([String(guest._id)])
		const number = `#${String(guest._id).slice(-8).toUpperCase()}`
		expect(await ids(`q=${encodeURIComponent(number)}`)).toEqual([String(guest._id)])

		await api().get('/api/admin/orders?from=2026-02-01&to=2026-01-01').set(admin.auth).expect(400)
		await api().get('/api/admin/orders?from=yesterday').set(admin.auth).expect(400)
	})

	it('keeps an internal note that customers never see', async () => {
		const customer = await createUser({ username: 'customer' })
		const order = await createOrder(customer.user)

		const saved = await api()
			.patch(`/api/admin/orders/${order._id}/note`)
			.set(admin.auth)
			.send({ adminNote: '  Call before shipping  ' })
			.expect(200)
		expect(saved.body).toEqual({ adminNote: 'Call before shipping' })

		const adminView = await api().get(`/api/admin/orders/${order._id}`).set(admin.auth)
		expect(adminView.body.adminNote).toBe('Call before shipping')

		const customerView = await api().get(`/api/orders/${order._id}`).set(customer.auth).expect(200)
		expect(customerView.body).not.toHaveProperty('adminNote')
		const mine = await api().get('/api/orders/mine').set(customer.auth).expect(200)
		expect(mine.body[0]).not.toHaveProperty('adminNote')

		await api()
			.patch(`/api/admin/orders/${order._id}/note`)
			.set(admin.auth)
			.send({ adminNote: '' })
			.expect(200)
		expect((await Order.findById(order._id).select('+adminNote').lean()).adminNote).toBeUndefined()
		await api()
			.patch(`/api/admin/orders/${order._id}/note`)
			.set(customer.auth)
			.send({ adminNote: 'x' })
			.expect(403)
	})

	it('records every status change', async () => {
		const customer = await createUser({ username: 'customer' })
		const order = await createOrder(customer.user)

		for (const status of ['paid', 'shipped']) {
			await api()
				.patch(`/api/orders/${order._id}/status`)
				.set(admin.auth)
				.send({ status })
				.expect(200)
		}
		const { body } = await api().get(`/api/admin/orders/${order._id}`).set(admin.auth)
		expect(body.statusHistory.map((entry) => entry.status)).toEqual(['paid', 'shipped'])
		expect(new Date(body.statusHistory[0].at).getTime()).not.toBeNaN()
	})

	it('counts orders and returns waiting for the shop', async () => {
		const customer = await createUser({ username: 'customer' })
		await createOrder(customer.user, { status: 'paid' })
		await createOrder(customer.user, { status: 'paid' })
		await createOrder(customer.user)
		await createOrder(customer.user, {
			status: 'delivered',
			returnRequest: { status: 'requested', reason: 'too_small', items: [] },
		})

		const { body } = await api().get('/api/admin/counts').set(admin.auth).expect(200)
		expect(body).toEqual({ ordersToShip: 2, ordersUnpaid: 1, openReturns: 1 })
	})
})
