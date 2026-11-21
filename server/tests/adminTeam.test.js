import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityLog } from '../src/models/ActivityLog.js'
import { User } from '../src/models/User.js'
import { PERMISSION_NAMES } from '../src/services/permissions.js'
import { deleteStaff, updateStaff } from '../src/services/team.js'
import { DEFAULT_PASSWORD, api, createProduct, createUser } from './helpers.js'

let owner

beforeEach(async () => {
	owner = await createUser({ username: 'owner', isAdmin: true })
})

const ID = '6a0000000000000000000001'

/** One request per area; staff without that permission must get 403. */
const AREAS = {
	dashboard: (r) => r.get('/api/admin/stats'),
	products: (r) => r.get('/api/admin/products'),
	orders: (r) => r.get('/api/admin/orders'),
	returns: (r) => r.patch(`/api/admin/orders/${ID}/return`).send({ status: 'approved' }),
	customers: (r) => r.get('/api/admin/customers'),
	reviews: (r) => r.get('/api/admin/reviews'),
	promoCodes: (r) => r.get('/api/admin/promo-codes'),
	settings: (r) => r.get('/api/admin/settings'),
	team: (r) => r.get('/api/admin/team'),
}

describe('permissions', () => {
	it.each(Object.keys(AREAS))('"%s" endpoints need the %s permission', async (area) => {
		const without = await createUser({
			username: 'without',
			permissions: PERMISSION_NAMES.filter((name) => name !== area),
		})
		const withIt = await createUser({ username: 'with', permissions: [area] })

		const denied = await AREAS[area](api()).set(without.auth)
		expect(denied.status).toBe(403)
		const allowed = await AREAS[area](api()).set(withIt.auth)
		// allowed through the guard (404 for the made-up order id is fine)
		expect([200, 404]).toContain(allowed.status)
		const asOwner = await AREAS[area](api()).set(owner.auth)
		expect([200, 404]).toContain(asOwner.status)
	})

	it('guards product writes, order status and review moderation outside /admin', async () => {
		const support = await createUser({ username: 'support', permissions: ['orders', 'reviews'] })
		const product = await createProduct()

		await api()
			.patch(`/api/products/${product._id}`)
			.set(support.auth)
			.send({ price: 1 })
			.expect(403)
		await api().delete(`/api/products/${product._id}`).set(support.auth).expect(403)
		await api().post('/api/admin/uploads').set(support.auth).expect(403)
		const warehouse = await createUser({ username: 'warehouse', permissions: ['products'] })
		await api()
			.patch(`/api/products/${product._id}`)
			.set(warehouse.auth)
			.send({ price: 1 })
			.expect(200)
		await api()
			.patch(`/api/orders/${ID}/status`)
			.set(warehouse.auth)
			.send({ status: 'paid' })
			.expect(403)
	})

	it('keeps customers out of every area', async () => {
		const customer = await createUser({ username: 'customer' })
		for (const request of Object.values(AREAS)) {
			expect((await request(api()).set(customer.auth)).status).toBe(403)
		}
		await api().get('/api/admin/counts').set(customer.auth).expect(403)
	})

	it('sends role, owner flag and permissions with the session', async () => {
		const login = await api()
			.post('/api/auth/login')
			.send({ login: 'owner', password: DEFAULT_PASSWORD })
			.expect(200)
		expect(login.body.user).toMatchObject({ role: 'staff', isOwner: true, isAdmin: true })

		const shopper = await createUser({ username: 'shopper' })
		expect(shopper.user).toMatchObject({ role: 'customer', isAdmin: false })
	})
})

describe('team management', () => {
	const create = (auth, body) => api().post('/api/admin/team').set(auth).send(body)
	const staffBody = (username, permissions = ['orders']) => ({
		username,
		email: `${username}@example.com`,
		password: 'temporary-123',
		permissions,
	})

	it('creates staff who can sign in with the temporary password', async () => {
		const res = await create(owner.auth, staffBody('ola', ['orders', 'returns'])).expect(201)
		expect(res.body).toMatchObject({
			username: 'ola',
			isOwner: false,
			permissions: ['orders', 'returns'],
		})

		const login = await api()
			.post('/api/auth/login')
			.send({ login: 'ola', password: 'temporary-123' })
			.expect(200)
		expect(login.body.user).toMatchObject({ role: 'staff', permissions: ['orders', 'returns'] })

		const list = await api().get('/api/admin/team').set(owner.auth).expect(200)
		expect(list.body.staff.map((s) => s.username)).toEqual(['owner', 'ola'])
		expect(list.body.presets.support).toEqual(['orders', 'returns', 'customers', 'reviews'])
		expect(Object.keys(list.body.permissions)).toEqual(PERMISSION_NAMES)

		await create(owner.auth, staffBody('ola')).expect(409)
		await create(owner.auth, { ...staffBody('bad'), permissions: ['everything'] }).expect(400)
	})

	it('changes permissions, deactivates, resets the password and deletes staff', async () => {
		const { body: ola } = await create(owner.auth, staffBody('ola')).expect(201)
		const login = (password) => api().post('/api/auth/login').send({ login: 'ola', password })
		const session = (await login('temporary-123')).body.accessToken
		const olaAuth = { Authorization: `Bearer ${session}` }

		await api().get('/api/admin/products').set(olaAuth).expect(403)
		await api()
			.patch(`/api/admin/team/${ola._id}`)
			.set(owner.auth)
			.send({ permissions: ['products'] })
			.expect(200)
		// read from the database on every request: no new sign-in needed
		await api().get('/api/admin/products').set(olaAuth).expect(200)

		await api()
			.patch(`/api/admin/team/${ola._id}`)
			.set(owner.auth)
			.send({ blocked: true })
			.expect(200)
		await api().get('/api/admin/products').set(olaAuth).expect(401)
		expect((await login('temporary-123')).status).toBe(403)
		await api().patch(`/api/admin/team/${ola._id}`).set(owner.auth).send({ blocked: false })

		await api()
			.post(`/api/admin/team/${ola._id}/password`)
			.set(owner.auth)
			.send({ password: 'another-pass-1' })
			.expect(200)
		expect((await login('temporary-123')).status).toBe(401)
		expect((await login('another-pass-1')).status).toBe(200)

		await api().delete(`/api/admin/team/${ola._id}`).set(owner.auth).expect(204)
		expect(await User.exists({ username: 'ola' })).toBeNull()
	})

	it('does not manage customers', async () => {
		const shopper = await createUser({ username: 'shopper' })
		await api()
			.patch(`/api/admin/team/${shopper.user._id}`)
			.set(owner.auth)
			.send({ permissions: ['orders'] })
			.expect(404)
	})

	it('protects the actor and the last owner', async () => {
		const self = `/api/admin/team/${owner.user._id}`
		await api().patch(self).set(owner.auth).send({ blocked: true }).expect(403)
		await api().patch(self).set(owner.auth).send({ isOwner: false }).expect(403)
		await api().delete(self).set(owner.auth).expect(403)
		// deleting oneself through the account page is not possible for staff either
		await api().delete('/api/users/me').set(owner.auth).expect(403)

		// a second owner may demote the first; then only owners can touch the remaining owner
		const { body: second } = await create(owner.auth, { ...staffBody('second'), isOwner: true })
		const secondLogin = await api()
			.post('/api/auth/login')
			.send({ login: 'second', password: 'temporary-123' })
		const secondAuth = { Authorization: `Bearer ${secondLogin.body.accessToken}` }
		await api().patch(self).set(secondAuth).send({ isOwner: false }).expect(200)
		await api()
			.patch(`/api/admin/team/${second._id}`)
			.set(owner.auth)
			.send({ blocked: true })
			.expect(403)
	})

	it('never demotes, blocks or removes the last active owner', async () => {
		// another owner acting would always remain, so this guards against stale or forged actors
		const ghost = { id: ID, isOwner: true, permissions: [] }
		await expect(updateStaff(owner.user._id, { isOwner: false }, ghost)).rejects.toMatchObject({
			status: 409,
		})
		await expect(deleteStaff(owner.user._id, ghost)).rejects.toMatchObject({ status: 409 })
		expect(await User.exists({ _id: owner.user._id, isOwner: true })).toBeTruthy()
	})

	it('stops staff managers from escalating', async () => {
		const lead = await createUser({ username: 'lead', permissions: ['team', 'orders'] })
		await create(lead.auth, staffBody('okay', ['orders'])).expect(201)
		await create(lead.auth, staffBody('nope', ['settings'])).expect(403)
		await create(lead.auth, { ...staffBody('boss'), isOwner: true }).expect(403)
		// owners are off limits for non-owners
		await api()
			.patch(`/api/admin/team/${owner.user._id}`)
			.set(lead.auth)
			.send({ blocked: true })
			.expect(403)
		await api()
			.post(`/api/admin/team/${owner.user._id}/password`)
			.set(lead.auth)
			.send({ password: 'hijacked-123' })
			.expect(403)
		// and nobody removes their own team permission
		await api()
			.patch(`/api/admin/team/${lead.user._id}`)
			.set(lead.auth)
			.send({ permissions: ['orders'] })
			.expect(403)
	})
})

describe('activity log', () => {
	it('records staff changes without secrets, for owners only', async () => {
		const product = await createProduct({ title: 'Wool Coat' })
		await api()
			.patch(`/api/products/${product._id}`)
			.set(owner.auth)
			.send({ price: 20 })
			.expect(200)
		await api()
			.post('/api/admin/team')
			.set(owner.auth)
			.send({ username: 'ola', email: 'ola@example.com', password: 'secret-pass-1' })
			.expect(201)

		await vi.waitFor(async () => expect(await ActivityLog.countDocuments()).toBe(2))
		const { body } = await api().get('/api/admin/activity').set(owner.auth).expect(200)
		expect(body.items.map((entry) => entry.action)).toEqual(['staff.create', 'product.update'])
		expect(body.items[1]).toMatchObject({
			actorName: 'owner',
			target: { kind: 'product', label: 'Wool Coat' },
			details: 'price',
		})
		expect(JSON.stringify(body)).not.toContain('secret-pass-1')

		const manager = await createUser({ username: 'manager', permissions: PERMISSION_NAMES })
		await api().get('/api/admin/activity').set(manager.auth).expect(403)
	})
})
