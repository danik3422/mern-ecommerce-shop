import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Order } from '../src/models/Order.js'
import * as payments from '../src/services/payments.js'
import { api, createProduct, createUser, stockOf, validAddress } from './helpers.js'

vi.mock('../src/services/mailer.js', () => ({ sendMail: vi.fn() }))
vi.mock('../src/services/payments.js', async (importOriginal) => ({
	...(await importOriginal()),
	refundPayment: vi.fn(),
}))

const DAY = 24 * 60 * 60 * 1000

/** A delivered order: 2 × black M at 50 with a 10 discount (so 90% of item prices is refunded). */
const deliveredOrder = async ({ user, paidOnline = true, deliveredDaysAgo = 3, ...extra } = {}) => {
	const product = await createProduct({ title: 'Coat', sizes: [{ label: 'M', stock: 0 }] })
	const order = await Order.create({
		user: user?._id,
		email: 'customer@example.com',
		accessToken: user ? undefined : 'guest-token',
		items: [
			{
				productId: product._id,
				color: 'black',
				size: 'M',
				quantity: 2,
				title: 'Coat',
				brand: 'B',
				image: '/c.jpg',
				price: 50,
			},
		],
		subtotal: 100,
		discount: 10,
		shipping: 0,
		amount: 90,
		address: validAddress,
		status: 'delivered',
		deliveredAt: new Date(Date.now() - deliveredDaysAgo * DAY),
		payment: paidOnline
			? { provider: 'stripe', paymentIntentId: 'pi_123', paidAt: new Date() }
			: { provider: 'none' },
		...extra,
	})
	return { order, product }
}

const returnBody = (product, quantity = 1) => ({
	items: [{ productId: product.id, color: 'black', size: 'M', quantity }],
	reason: 'too_small',
	comment: 'Fits small',
})

describe('return requests', () => {
	let customer
	beforeEach(async () => {
		vi.mocked(payments.refundPayment).mockReset().mockResolvedValue('re_1')
		customer = await createUser({ username: 'alice' })
	})

	it('lets customers return delivered items and computes the refund with the discount share', async () => {
		const { order, product } = await deliveredOrder({ user: customer.user })
		const { body } = await api()
			.post(`/api/orders/${order.id}/return`)
			.set(customer.auth)
			.send(returnBody(product))
			.expect(201)

		expect(body.returnRequest).toMatchObject({
			status: 'requested',
			reason: 'too_small',
			refundAmount: 45,
			items: [{ title: 'Coat', quantity: 1, price: 50 }],
		})
	})

	it('lets guests return with their order token', async () => {
		const { order, product } = await deliveredOrder()
		await api().post(`/api/orders/${order.id}/return`).send(returnBody(product)).expect(404)
		await api()
			.post(`/api/orders/${order.id}/return`)
			.set('X-Order-Token', 'guest-token')
			.send(returnBody(product))
			.expect(201)
	})

	it.each([
		['after the return window', { deliveredDaysAgo: 31 }, 1, 409],
		['before delivery', { status: 'shipped', deliveredAt: undefined }, 1, 409],
		['more than was ordered', {}, 3, 400],
	])('rejects returns %s', async (_case, overrides, quantity, status) => {
		const { order, product } = await deliveredOrder({ user: customer.user, ...overrides })
		await api()
			.post(`/api/orders/${order.id}/return`)
			.set(customer.auth)
			.send(returnBody(product, quantity))
			.expect(status)
	})

	it('allows one return per order', async () => {
		const { order, product } = await deliveredOrder({ user: customer.user })
		const send = () =>
			api().post(`/api/orders/${order.id}/return`).set(customer.auth).send(returnBody(product))
		const statuses = (await Promise.all([send(), send()])).map((res) => res.status).sort()
		expect(statuses).toEqual([201, 409])
	})
})

describe('return decisions', () => {
	let admin
	let customer
	beforeEach(async () => {
		vi.mocked(payments.refundPayment).mockReset().mockResolvedValue('re_1')
		admin = await createUser({ username: 'admin', isAdmin: true })
		customer = await createUser({ username: 'alice' })
	})

	const decide = (order, body) =>
		api().patch(`/api/admin/orders/${order.id}/return`).set(admin.auth).send(body)

	const requestReturn = async (options) => {
		const { order, product } = await deliveredOrder({ user: customer.user, ...options })
		await api()
			.post(`/api/orders/${order.id}/return`)
			.set(customer.auth)
			.send(returnBody(product, 2))
		return { order, product }
	}

	it('approves, then refunds online once and puts the items back into stock', async () => {
		const { order, product } = await requestReturn()

		await decide(order, { status: 'refunded' }).expect(409) // must be approved first
		await decide(order, { status: 'approved', note: 'Please use the prepaid label' }).expect(200)
		const { body } = await decide(order, { status: 'refunded' }).expect(200)

		expect(body.returnRequest).toMatchObject({
			status: 'refunded',
			refundAmount: 90,
			refundedOnline: true,
		})
		expect(payments.refundPayment).toHaveBeenCalledTimes(1)
		expect(payments.refundPayment).toHaveBeenCalledWith(
			expect.objectContaining({ paymentIntentId: 'pi_123', amount: 90 }),
		)
		expect(await stockOf(product.id, 'black', 'M')).toBe(2)
		expect((await Order.findById(order.id)).payment.refunded).toBe(90)

		await decide(order, { status: 'refunded' }).expect(409)
		expect(payments.refundPayment).toHaveBeenCalledTimes(1)
	})

	it('marks returns of orders paid on delivery for a manual refund', async () => {
		const { order } = await requestReturn({ paidOnline: false })
		await decide(order, { status: 'approved' }).expect(200)
		const { body } = await decide(order, { status: 'refunded' }).expect(200)
		expect(body.returnRequest.refundedOnline).toBe(false)
		expect(payments.refundPayment).not.toHaveBeenCalled()
	})

	it('can reject a return and lists orders by return status', async () => {
		const { order } = await requestReturn()
		const listed = await api().get('/api/admin/orders?returnStatus=requested').set(admin.auth)
		expect(listed.body.items.map((o) => o._id)).toEqual([order.id])

		await decide(order, { status: 'rejected', note: 'Worn items cannot be returned' }).expect(200)
		await decide(order, { status: 'approved' }).expect(409)
	})

	it('refunds the full amount when a paid order is cancelled', async () => {
		const { order } = await deliveredOrder({
			user: customer.user,
			status: 'paid',
			deliveredAt: undefined,
		})
		await api()
			.patch(`/api/orders/${order.id}/status`)
			.set(admin.auth)
			.send({ status: 'cancelled' })
			.expect(200)
		expect(payments.refundPayment).toHaveBeenCalledWith(
			expect.objectContaining({ paymentIntentId: 'pi_123', amount: 90 }),
		)
	})
})
