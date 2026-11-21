import { describe, expect, it } from 'vitest'
import { Cart } from '../src/models/Cart.js'
import { Order } from '../src/models/Order.js'
import { DEFAULT_PASSWORD, api, createProduct, createUser, validAddress } from './helpers.js'

describe('/api/users/me', () => {
	it('returns the current user', async () => {
		const { auth } = await createUser({ username: 'alice' })
		const res = await api().get('/api/users/me').set(auth).expect(200)
		expect(res.body).toMatchObject({ username: 'alice', isAdmin: false })
		expect(res.body).not.toHaveProperty('passwordHash')
	})

	it('updates the username', async () => {
		const { auth } = await createUser()
		const res = await api()
			.patch('/api/users/me')
			.set(auth)
			.send({ username: 'alice2' })
			.expect(200)
		expect(res.body.username).toBe('alice2')
	})

	it('does not let users make themselves admins', async () => {
		const { auth } = await createUser()
		await api().patch('/api/users/me').set(auth).send({ isAdmin: true }).expect(400)
		expect((await api().get('/api/users/me').set(auth)).body.isAdmin).toBe(false)
	})

	it('requires the current password to change email or password', async () => {
		const { auth } = await createUser()
		const patch = (body) => api().patch('/api/users/me').set(auth).send(body)

		await patch({ email: 'new@example.com' }).expect(400)
		await patch({ email: 'new@example.com', currentPassword: 'wrong-password' }).expect(403)
		await patch({ newPassword: 'new-password-1', currentPassword: DEFAULT_PASSWORD }).expect(200)

		await api()
			.post('/api/auth/login')
			.send({ login: 'alice', password: 'new-password-1' })
			.expect(200)
	})

	it('returns 409 when the new email is taken', async () => {
		await createUser({ username: 'bob' })
		const { auth } = await createUser({ username: 'alice' })
		await api()
			.patch('/api/users/me')
			.set(auth)
			.send({ email: 'bob@example.com', currentPassword: DEFAULT_PASSWORD })
			.expect(409)
	})

	it('deletes the account and cart but keeps orders', async () => {
		const product = await createProduct()
		const { user, auth } = await createUser()
		const items = [{ productId: product.id, quantity: 1, color: 'black', size: 'S' }]
		await api().post('/api/orders').set(auth).send({ items, address: validAddress }).expect(201)
		await api().put('/api/cart').set(auth).send({ items }).expect(200)

		await api().delete('/api/users/me').set(auth).expect(204)

		expect(await Cart.countDocuments({ user: user._id })).toBe(0)
		expect(await Order.countDocuments({ user: user._id })).toBe(1)
	})
})

describe('user administration', () => {
	it('lets staff list and delete customers, but not promote them or delete staff', async () => {
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const support = await createUser({ username: 'support', permissions: ['customers'] })
		const { user } = await createUser({ username: 'alice' })

		// staff accounts are not customers
		const list = await api().get('/api/users').set(admin.auth).expect(200)
		expect(list.body.map((u) => u.username)).toEqual(['alice'])

		// promoting customers is gone: staff accounts are created under Team
		await api().patch(`/api/users/${user._id}`).set(admin.auth).send({ isAdmin: true }).expect(404)
		await api().delete(`/api/users/${support.user._id}`).set(admin.auth).expect(403)
		await api().delete(`/api/users/${user._id}`).set(support.auth).expect(204)
	})

	it('forbids regular users', async () => {
		const { auth } = await createUser()
		await api().get('/api/users').set(auth).expect(403)
		await api().get('/api/users/stats').set(auth).expect(403)
	})
})
