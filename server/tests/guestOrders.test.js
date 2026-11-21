import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Order } from '../src/models/Order.js'
import { sendMail } from '../src/services/mailer.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'
import { formatters } from '../src/services/emails/format.js'

vi.mock('../src/services/mailer.js', () => ({ sendMail: vi.fn() }))

const orderBody = (product, extra = {}) => ({
	items: [{ productId: product.id, quantity: 1, color: 'black', size: 'M' }],
	address: validAddress,
	...extra,
})

describe('guest checkout', () => {
	let product
	beforeEach(async () => {
		vi.mocked(sendMail).mockClear()
		product = await createProduct()
	})

	it('creates an order for a guest with an email and returns a secret token once', async () => {
		const { body } = await api()
			.post('/api/orders')
			.send(orderBody(product, { email: 'Guest@Example.com' }))
			.expect(201)

		expect(body.accessToken).toEqual(expect.any(String))
		expect(body.order).toMatchObject({ email: 'guest@example.com', status: 'pending' })
		expect(body.order).not.toHaveProperty('user')
		expect(body.order).not.toHaveProperty('accessToken')
	})

	it('requires an email from guests', async () => {
		const res = await api().post('/api/orders').send(orderBody(product)).expect(400)
		expect(res.body.details).toEqual([{ path: 'email', message: 'Required' }])
	})

	it('lets only the token holder, not other customers, open and cancel a guest order', async () => {
		const { body } = await api()
			.post('/api/orders')
			.send(orderBody(product, { email: 'guest@example.com' }))
		const url = `/api/orders/${body.order._id}`
		const stranger = await createUser({ username: 'stranger' })

		await api().get(url).expect(404)
		await api().get(url).set('X-Order-Token', 'wrong-token').expect(404)
		await api().get(url).set(stranger.auth).expect(404)
		const res = await api().get(url).set('X-Order-Token', body.accessToken).expect(200)
		expect(res.body).not.toHaveProperty('accessToken')

		await api().post(`${url}/cancel`).set(stranger.auth).expect(404)
		await api().post(`${url}/cancel`).set('X-Order-Token', body.accessToken).expect(200)
	})

	it('lets admins find a guest order by email', async () => {
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const { body } = await api()
			.post('/api/orders')
			.send(orderBody(product, { email: 'guest@example.com' }))

		const res = await api().get('/api/admin/orders?q=guest@exa').set(admin.auth).expect(200)
		expect(res.body.items.map((order) => order._id)).toEqual([body.order._id])
		expect(res.body.items[0]).not.toHaveProperty('accessToken')
	})

	it('uses the account email for signed-in customers and keeps no token', async () => {
		const { auth } = await createUser({ username: 'alice' })
		const { body } = await api()
			.post('/api/orders')
			.set(auth)
			.send(orderBody(product, { email: 'other@example.com' }))
			.expect(201)
		expect(body.order.email).toBe('alice@example.com')
		expect(body).not.toHaveProperty('accessToken')
		expect(
			(await Order.findById(body.order._id).select('+accessToken')).accessToken,
		).toBeUndefined()
	})
})

describe('order emails', () => {
	beforeEach(() => vi.mocked(sendMail).mockClear())

	it('confirms the order and reports status changes, with a token link for guests', async () => {
		const product = await createProduct({ title: 'Coat', price: 30 })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const { body } = await api()
			.post('/api/orders')
			.send(orderBody(product, { email: 'guest@example.com' }))

		expect(sendMail).toHaveBeenCalledTimes(1)
		const placed = sendMail.mock.calls[0][0]
		expect(placed).toMatchObject({
			to: 'guest@example.com',
			subject: expect.stringMatching(/^We received your order #[0-9A-F]{8}$/),
		})
		expect(placed.text).toContain(`1 × Brand Coat (black, M) — ${formatters('en').money(30)}`)
		expect(placed.html).toContain('Brand Coat')
		expect(placed.text).toContain(`token=${body.accessToken}`)

		await api()
			.patch(`/api/orders/${body.order._id}/status`)
			.set(admin.auth)
			.send({ status: 'paid' })
		await api()
			.patch(`/api/orders/${body.order._id}/status`)
			.set(admin.auth)
			.send({ status: 'shipped' })

		const subjects = sendMail.mock.calls.map(([mail]) => mail.subject.replace(/#\w+/, '#N'))
		expect(subjects).toEqual([
			'We received your order #N',
			'Payment received for order #N',
			'Your order #N is on its way',
		])
	})
})
