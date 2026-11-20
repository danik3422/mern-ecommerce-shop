import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import * as payments from '../src/services/payments.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

// Stripe is never called in tests: the payments service is replaced with mocks
vi.mock('../src/services/payments.js', () => ({
	isPaymentsEnabled: vi.fn(),
	isWebhookConfigured: vi.fn(),
	createCheckoutSession: vi.fn(),
	expireCheckoutSession: vi.fn(),
	parseWebhookEvent: vi.fn(),
}))

let sessionCounter = 0

const orderBody = (product) => ({
	items: [{ productId: product.id, quantity: 2, color: 'black', size: 'M' }],
	address: validAddress,
})

const stockOf = async (product) =>
	(await Product.findById(product.id).lean()).sizes.find((s) => s.label === 'M').stock

const sendWebhook = (event) => {
	vi.mocked(payments.parseWebhookEvent).mockReturnValue(event)
	return api()
		.post('/api/payments/webhook')
		.set('Content-Type', 'application/json')
		.set('stripe-signature', 't=1,v1=signature')
		.send(JSON.stringify(event))
}

const sessionEvent = (type, order, overrides = {}) => ({
	id: `evt_${++sessionCounter}`,
	type,
	data: {
		object: {
			id: order.payment.sessionId,
			metadata: { orderId: order._id },
			client_reference_id: order._id,
			payment_status: type === 'checkout.session.completed' ? 'paid' : 'unpaid',
			...overrides,
		},
	},
})

describe('payments with Stripe', () => {
	beforeEach(() => {
		vi.mocked(payments.isPaymentsEnabled).mockReturnValue(true)
		vi.mocked(payments.isWebhookConfigured).mockReturnValue(true)
		vi.mocked(payments.createCheckoutSession).mockImplementation(async () => {
			const id = `cs_test_${++sessionCounter}`
			return { id, url: `https://checkout.stripe.com/c/pay/${id}` }
		})
		vi.mocked(payments.expireCheckoutSession).mockResolvedValue(undefined)
	})

	const checkout = async () => {
		const product = await createProduct({ price: 30 })
		const { auth } = await createUser()
		const res = await api().post('/api/orders').set(auth).send(orderBody(product)).expect(201)
		return { product, auth, order: res.body.order, checkoutUrl: res.body.checkoutUrl }
	}

	it('returns the payment page URL and remembers the session', async () => {
		const { order, checkoutUrl } = await checkout()

		expect(checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//)
		expect(order.payment).toMatchObject({ provider: 'stripe', sessionId: expect.any(String) })
		const [sessionOrder] = vi.mocked(payments.createCheckoutSession).mock.calls.at(-1)
		expect(sessionOrder.amount).toBe(60)
	})

	it('cancels the order and returns stock when Stripe is unavailable', async () => {
		vi.mocked(payments.createCheckoutSession).mockRejectedValueOnce(new Error('Stripe is down'))
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const product = await createProduct()
		const { auth } = await createUser()

		await api().post('/api/orders').set(auth).send(orderBody(product)).expect(502)

		expect(await Order.findOne().lean()).toMatchObject({ status: 'cancelled' })
		expect(await stockOf(product)).toBe(5)
	})

	it('starts a new payment for a pending order and expires the previous session', async () => {
		const { auth, order } = await checkout()

		const res = await api().post(`/api/orders/${order._id}/pay`).set(auth).expect(200)

		expect(res.body.checkoutUrl).toMatch(/checkout\.stripe\.com/)
		expect(payments.expireCheckoutSession).toHaveBeenCalledWith(order.payment.sessionId)
		const saved = await Order.findById(order._id).lean()
		expect(saved.payment.sessionId).not.toBe(order.payment.sessionId)
	})

	it('expires the payment session when the customer cancels', async () => {
		const { auth, order } = await checkout()
		await api().post(`/api/orders/${order._id}/cancel`).set(auth).expect(200)
		expect(payments.expireCheckoutSession).toHaveBeenCalledWith(order.payment.sessionId)
	})

	describe('webhook', () => {
		it('marks the order as paid once, even when the event is repeated', async () => {
			const { order } = await checkout()
			const event = sessionEvent('checkout.session.completed', order)

			await sendWebhook(event).expect(200)
			await sendWebhook(event).expect(200)

			const saved = await Order.findById(order._id).lean()
			expect(saved.status).toBe('paid')
			expect(saved.payment.paidAt).toBeInstanceOf(Date)
		})

		it('ignores completed sessions that are not paid yet', async () => {
			const { order } = await checkout()
			await sendWebhook(
				sessionEvent('checkout.session.completed', order, { payment_status: 'unpaid' }),
			).expect(200)
			expect((await Order.findById(order._id).lean()).status).toBe('pending')
		})

		it('cancels the order and returns stock when the session expires', async () => {
			const { order, product } = await checkout()
			expect(await stockOf(product)).toBe(3)

			await sendWebhook(sessionEvent('checkout.session.expired', order)).expect(200)

			expect((await Order.findById(order._id).lean()).status).toBe('cancelled')
			expect(await stockOf(product)).toBe(5)
		})

		it('keeps the order when an old session expires after a new one was started', async () => {
			const { auth, order, product } = await checkout()
			await api().post(`/api/orders/${order._id}/pay`).set(auth).expect(200)

			// `order` still carries the first session id
			await sendWebhook(sessionEvent('checkout.session.expired', order)).expect(200)

			expect((await Order.findById(order._id).lean()).status).toBe('pending')
			expect(await stockOf(product)).toBe(3)
		})

		it('acknowledges events it does not handle', async () => {
			const { order } = await checkout()
			await sendWebhook(sessionEvent('payment_intent.created', order)).expect(200)
		})

		it('rejects requests with an invalid signature', async () => {
			vi.mocked(payments.parseWebhookEvent).mockImplementation(() => {
				throw new Error('No signatures found matching the expected signature')
			})
			await api()
				.post('/api/payments/webhook')
				.set('Content-Type', 'application/json')
				.send('{}')
				.expect(400)
		})

		it('responds 503 when webhooks are not configured', async () => {
			vi.mocked(payments.isWebhookConfigured).mockReturnValue(false)
			await api()
				.post('/api/payments/webhook')
				.set('Content-Type', 'application/json')
				.send('{}')
				.expect(503)
		})
	})
})
