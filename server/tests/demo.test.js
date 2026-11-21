import { describe, expect, it, vi } from 'vitest'

// demo mode must be on before src/config/env.js is loaded by the imports below
vi.hoisted(() => {
	process.env.DEMO_MODE = 'true'
})

const { Order } = await import('../src/models/Order.js')
const { Product } = await import('../src/models/Product.js')
const { PromoCode } = await import('../src/models/PromoCode.js')
const { Session } = await import('../src/models/Session.js')
const { User } = await import('../src/models/User.js')
const { DEMO_ACCOUNTS, resetDemoData } = await import('../src/seed/demo.js')
const { api, createUser } = await import('./helpers.js')

const demoLogin = (account) => api().post('/api/auth/demo').send({ account })
const bearer = (res) => ({ Authorization: `Bearer ${res.body.accessToken}` })

describe('demo data reset', () => {
	it('creates the demo accounts, orders and promo codes', async () => {
		const result = await resetDemoData()
		expect(result.products).toBeGreaterThan(30)
		expect(result.orders).toBeGreaterThan(20)

		const admin = await User.findOne({ username: DEMO_ACCOUNTS.admin.username }).lean()
		expect(admin).toMatchObject({ role: 'staff', isDemo: true })
		expect(admin.permissions).toEqual(DEMO_ACCOUNTS.admin.permissions)
		expect(admin.permissions).not.toContain('team')

		const customer = await User.findOne({ username: 'demo' }).lean()
		expect(customer.addresses).toHaveLength(2)
		expect(customer.wishlist.length).toBeGreaterThan(0)
		const statuses = (await Order.find({ user: customer._id }).lean()).map((o) => o.status)
		expect(statuses).toEqual(expect.arrayContaining(['delivered', 'shipped', 'pending']))

		expect(await Order.exists({ 'returnRequest.status': 'requested' })).toBeTruthy()
		expect(await PromoCode.countDocuments()).toBe(3)
	})

	it('undoes what visitors changed, removes their accounts and keeps the owner', async () => {
		await resetDemoData()
		const visitor = await createUser({ username: 'visitor' })
		const owner = await createUser({ username: 'boss', isAdmin: true })
		const tee = await Product.findOne({ slug: 'essential-white-tee' })
		const originalPrice = tee.price
		await Product.updateOne({ _id: tee._id }, { price: 1, active: false })

		const result = await resetDemoData()

		expect(result.removedAccounts).toBe(1)
		expect(await User.exists({ _id: visitor.user._id })).toBeNull()
		expect(await User.exists({ _id: owner.user._id })).toBeTruthy()
		const restored = await Product.findOne({ slug: 'essential-white-tee' }).lean()
		expect(restored).toMatchObject({ price: originalPrice, active: true })
	})
})

describe('POST /api/auth/demo', () => {
	it('signs in to the demo customer without a password', async () => {
		await resetDemoData()
		const res = await demoLogin('customer').expect(200)
		expect(res.body.user).toMatchObject({ username: 'demo', isDemo: true, isAdmin: false })

		const orders = await api().get('/api/orders/mine').set(bearer(res)).expect(200)
		expect(orders.body.length).toBe(4)
	})

	it('signs in to the demo admin with limited access', async () => {
		await resetDemoData()
		const res = await demoLogin('admin').expect(200)
		expect(res.body.user).toMatchObject({ username: 'demo-admin', isAdmin: true })

		await api().get('/api/admin/stats').set(bearer(res)).expect(200)
		await api().get('/api/admin/products').set(bearer(res)).expect(200)
		await api().get('/api/admin/team').set(bearer(res)).expect(403)
		await api().get('/api/admin/settings').set(bearer(res)).expect(403)
		await api().get('/api/admin/customers').set(bearer(res)).expect(403)
	})

	it('does not let anyone change or delete the shared demo accounts', async () => {
		await resetDemoData()
		const res = await demoLogin('customer')
		const blocked = await api()
			.patch('/api/users/me')
			.set(bearer(res))
			.send({ username: 'mine-now' })
			.expect(403)
		expect(blocked.body.message).toMatch(/demo/i)
		await api().delete('/api/users/me').set(bearer(res)).expect(403)
		expect(await User.exists({ username: 'demo' })).toBeTruthy()
	})

	it('gives every visitor an own session they cannot use to sign out others', async () => {
		await resetDemoData()
		const first = await demoLogin('customer').expect(200)
		const second = await demoLogin('customer').expect(200)

		// visitors see only their own device, not each other's
		const { body: sessions } = await api().get('/api/auth/sessions').set(bearer(second))
		expect(sessions).toEqual([expect.objectContaining({ current: true })])
		await api().post('/api/auth/sessions/revoke-others').set(bearer(second)).expect(403)
		const others = await Session.find({ _id: { $ne: sessions[0].id } }).lean()
		await api().delete(`/api/auth/sessions/${others[0]._id}`).set(bearer(second)).expect(403)
		await api().get('/api/orders/mine').set(bearer(first)).expect(200)
		// signing out this device is fine
		await api().delete(`/api/auth/sessions/${sessions[0].id}`).set(bearer(second)).expect(204)
		await api().get('/api/orders/mine').set(bearer(second)).expect(401)
	})

	it('validates the account name and tells when demo data is missing', async () => {
		await demoLogin('owner').expect(400)
		await demoLogin('customer').expect(404)
	})

	it('announces demo mode in the shop config', async () => {
		const res = await api().get('/api/shop/config').expect(200)
		expect(res.body.demo).toEqual({ enabled: true, resetHour: 3, timeZone: 'Europe/Warsaw' })
	})
})
