import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StockAlert } from '../src/models/StockAlert.js'
import { sendMail } from '../src/services/mailer.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

vi.mock('../src/services/mailer.js', () => ({ sendMail: vi.fn() }))

const soldOutInM = () =>
	createProduct({
		title: 'Coat',
		slug: 'coat',
		sizes: [
			{ label: 'S', stock: 1 },
			{ label: 'M', stock: 0 },
		],
	})

const subscribe = (product, body, auth = {}) =>
	api().post(`/api/products/${product.id}/stock-alerts`).set(auth).send(body)

describe('back-in-stock alerts', () => {
	beforeEach(() => vi.mocked(sendMail).mockClear())

	it('lets guests subscribe to a sold-out size with an email', async () => {
		const product = await soldOutInM()
		const res = await subscribe(product, { size: 'M', email: 'Anna@Example.com' }).expect(201)
		expect(res.body.message).toMatch(/anna@example.com/)
		// subscribing twice keeps a single alert
		await subscribe(product, { size: 'M', email: 'anna@example.com' }).expect(201)
		expect(await StockAlert.countDocuments()).toBe(1)
	})

	it('uses the account email of signed-in customers', async () => {
		const product = await soldOutInM()
		const { auth } = await createUser({ username: 'bob' })
		await subscribe(product, { size: 'M' }, auth).expect(201)
		expect((await StockAlert.findOne()).email).toBe('bob@example.com')
	})

	it('rejects sizes in stock, unknown sizes and a missing email', async () => {
		const product = await soldOutInM()
		await subscribe(product, { size: 'S', email: 'a@example.com' }).expect(409)
		await subscribe(product, { size: 'XXL', email: 'a@example.com' }).expect(400)
		await subscribe(product, { size: 'M' }).expect(400)
		await subscribe(product, { size: 'M', email: 'not-an-email' }).expect(400)
	})

	it('emails subscribers once when an admin restocks the size', async () => {
		const product = await soldOutInM()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		await subscribe(product, { size: 'M', email: 'anna@example.com' }).expect(201)

		const restock = () =>
			api()
				.patch(`/api/products/${product.id}`)
				.set(admin.auth)
				.send({
					sizes: [
						{ label: 'S', stock: 1 },
						{ label: 'M', stock: 4 },
					],
				})
				.expect(200)

		await restock()
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(sendMail.mock.calls[0][0]).toMatchObject({
			to: 'anna@example.com',
			subject: expect.stringContaining('Back in stock: Brand Coat (M)'),
			text: expect.stringContaining('/product/coat'),
		})

		await restock()
		expect(sendMail).toHaveBeenCalledTimes(1)
	})

	it('emails subscribers when a cancelled order returns the last item', async () => {
		const product = await createProduct({ sizes: [{ label: 'M', stock: 1 }] })
		const { auth } = await createUser()
		const item = { productId: product.id, quantity: 1, size: 'M', color: 'black' }
		const { body } = await api()
			.post('/api/orders')
			.set(auth)
			.send({ items: [item], address: validAddress })
			.expect(201)

		await subscribe(product, { size: 'M', email: 'waiting@example.com' }).expect(201)
		await api().post(`/api/orders/${body.order._id}/cancel`).set(auth).expect(200)

		expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'waiting@example.com' }))
	})

	it('can subscribe again after being notified', async () => {
		const product = await soldOutInM()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		await subscribe(product, { size: 'M', email: 'anna@example.com' })
		await api()
			.patch(`/api/products/${product.id}`)
			.set(admin.auth)
			.send({ sizes: [{ label: 'M', stock: 2 }] })
		await api()
			.patch(`/api/products/${product.id}`)
			.set(admin.auth)
			.send({ sizes: [{ label: 'M', stock: 0 }] })

		await subscribe(product, { size: 'M', email: 'anna@example.com' }).expect(201)
		expect((await StockAlert.findOne()).notifiedAt).toBeNull()
	})
})
