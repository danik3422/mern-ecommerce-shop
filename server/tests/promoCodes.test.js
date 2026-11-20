import { beforeEach, describe, expect, it } from 'vitest'
import { PromoCode } from '../src/models/PromoCode.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'
import { formatAmount } from '../src/services/pricing.js'
import { price, roundMoney } from './pricingHelpers.js'

const line = (product, quantity = 1) => ({
	productId: product.id,
	quantity,
	color: 'black',
	size: 'M',
})

const quote = (body) => api().post('/api/checkout/quote').send(body)

describe('checkout quote and promo codes', () => {
	let product
	beforeEach(async () => {
		product = await createProduct({ price: 30, sizes: [{ label: 'M', stock: 5 }] })
	})

	it('exposes the shop config with delivery options', async () => {
		const { body } = await api().get('/api/shop/config').expect(200)
		expect(body.shippingMethods.map((m) => m.id)).toEqual(['standard', 'locker', 'express'])
		expect(body).toHaveProperty('freeShippingFrom')
	})

	it('quotes totals for guests with a delivery method and a promo code in any case', async () => {
		await PromoCode.create({ code: 'SPRING20', type: 'percent', value: 20, description: '20% off' })

		const { body } = await quote({
			items: [line(product, 2)],
			shippingMethod: 'express',
			promoCode: ' spring20 ',
		}).expect(200)

		expect(body).toMatchObject({
			subtotal: 60,
			discount: 12,
			shipping: price('express'),
			amount: roundMoney(48 + price('express')),
			promo: { code: 'SPRING20', description: '20% off' },
		})
	})

	it.each([
		['unknown', {}, 'NOPE', /does not exist/],
		['inactive', { active: false }, 'CODE', /does not exist/],
		['expired', { endsAt: new Date(Date.now() - 1000) }, 'CODE', /expired/],
		['not started', { startsAt: new Date(Date.now() + 86_400_000) }, 'CODE', /not active yet/],
		['used up', { maxUses: 1, usedCount: 1 }, 'CODE', /used up/],
		['below minimum', { minSubtotal: 100 }, 'CODE', `at least ${formatAmount(100)}`],
	])('explains why a %s code cannot be used', async (_case, overrides, code, message) => {
		await PromoCode.create({ code: 'CODE', type: 'fixed', value: 5, ...overrides })
		const { body } = await quote({ items: [line(product)], promoCode: code }).expect(400)
		expect(body.details).toEqual([
			{ path: 'promoCode', message: expect.stringContaining(message.source ?? message) },
		])
	})

	it('counts a use per order, gives it back on cancel and never exceeds the limit', async () => {
		await PromoCode.create({ code: 'ONCE', type: 'fixed', value: 5, maxUses: 1 })
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const order = (user) =>
			api()
				.post('/api/orders')
				.set(user.auth)
				.send({ items: [line(product)], address: validAddress, promoCode: 'once' })

		// both customers try the last use at the same time
		const [first, second] = await Promise.all([order(alice), order(bob)])
		const statuses = [first.status, second.status].sort()
		expect(statuses).toEqual([201, 409])
		const winner = first.status === 201 ? first : second
		expect(winner.body.order).toMatchObject({
			discount: 5,
			promoCode: 'ONCE',
			amount: roundMoney(25 + price('standard')),
		})
		expect((await PromoCode.findOne({ code: 'ONCE' })).usedCount).toBe(1)

		const winnerAuth = first.status === 201 ? alice.auth : bob.auth
		await api().post(`/api/orders/${winner.body.order._id}/cancel`).set(winnerAuth).expect(200)
		expect((await PromoCode.findOne({ code: 'ONCE' })).usedCount).toBe(0)
	})

	it('stores the delivery method on the order', async () => {
		const { auth } = await createUser()
		const { body } = await api()
			.post('/api/orders')
			.set(auth)
			.send({ items: [line(product)], address: validAddress, shippingMethod: 'locker' })
			.expect(201)
		expect(body.order.shippingMethod).toEqual({
			id: 'locker',
			label: 'Parcel locker',
			price: price('locker'),
		})
	})
})

describe('promo code administration', () => {
	it('lets admins create, list, update and delete codes', async () => {
		const { auth } = await createUser({ isAdmin: true })
		const created = await api()
			.post('/api/admin/promo-codes')
			.set(auth)
			.send({ code: 'summer-10', type: 'percent', value: 10, maxUses: 100 })
			.expect(201)
		expect(created.body.code).toBe('SUMMER-10')

		expect((await api().get('/api/admin/promo-codes').set(auth)).body).toHaveLength(1)

		const updated = await api()
			.patch(`/api/admin/promo-codes/${created.body._id}`)
			.set(auth)
			.send({ type: 'percent', value: 15, maxUses: null })
			.expect(200)
		expect(updated.body).toMatchObject({ value: 15 })
		expect(updated.body).not.toHaveProperty('maxUses')

		await api().delete(`/api/admin/promo-codes/${created.body._id}`).set(auth).expect(204)
	})

	it('validates codes', async () => {
		const { auth } = await createUser({ isAdmin: true })
		const create = (body) => api().post('/api/admin/promo-codes').set(auth).send(body)
		await create({ code: 'X', type: 'fixed', value: 5 }).expect(400)
		await create({ code: 'BIG', type: 'percent', value: 150 }).expect(400)
		await create({ code: 'NONE', type: 'fixed', value: 0 }).expect(400)
		await create({
			code: 'DATES',
			type: 'free_shipping',
			startsAt: '2030-02-01',
			endsAt: '2030-01-01',
		}).expect(400)
		await create({ code: 'DUP', type: 'free_shipping' }).expect(201)
		await create({ code: 'dup', type: 'free_shipping' }).expect(409)
	})

	it('is admin-only', async () => {
		const { auth } = await createUser()
		await api().get('/api/admin/promo-codes').set(auth).expect(403)
	})
})
