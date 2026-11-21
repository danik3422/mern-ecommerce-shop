import { describe, expect, it } from 'vitest'
import { ActivityLog } from '../src/models/ActivityLog.js'
import {
	addWorkingDays,
	estimateDelivery,
	toTracking,
	trackingUrl,
} from '../src/services/tracking.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'
import { defaultSettings } from './pricingHelpers.js'

const placeOrder = async (auth, product, shippingMethod = 'standard') => {
	const res = await api()
		.post('/api/orders')
		.set(auth)
		.send({
			items: [{ productId: product.id, quantity: 1, color: 'black', size: 'M' }],
			address: validAddress,
			shippingMethod,
		})
		.expect(201)
	return res.body.order
}

const setStatus = (auth, orderId, body) =>
	api().patch(`/api/orders/${orderId}/status`).set(auth).send(body)

describe('tracking links', () => {
	it('are generated for known carriers', () => {
		expect(trackingUrl('inpost', '123456789012345678901234')).toBe(
			'https://inpost.pl/sledzenie-przesylek?number=123456789012345678901234',
		)
		expect(trackingUrl('dpd', '1000 2000 3000')).toBe(
			'https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=100020003000',
		)
		expect(trackingUrl('poczta', '00259007738948301225')).toContain('poczta-polska.pl')
		expect(trackingUrl('dhl', 'JJD000390007')).toContain('tracking-id=JJD000390007')
		expect(trackingUrl('gls', '123')).toContain('gls-group.com')
		expect(trackingUrl('other', '123')).toBeUndefined()
	})

	it('can be replaced by a link the admin typed', () => {
		const now = new Date()
		expect(
			toTracking({ carrier: 'inpost', number: '123', url: 'https://example.com/t/1' }, now),
		).toEqual({ carrier: 'inpost', number: '123', url: 'https://example.com/t/1', updatedAt: now })
		expect(toTracking({ carrier: 'other', number: 'AB123' }, now)).toEqual({
			carrier: 'other',
			number: 'AB123',
			updatedAt: now,
		})
	})
})

describe('delivery estimate', () => {
	it('adds working days and skips weekends', () => {
		// Friday + 1 working day = Monday
		expect(addWorkingDays(new Date('2026-11-20T15:00:00Z'), 1).toISOString()).toMatch(/^2026-11-23/)
		// Saturday + 2 working days = Wednesday (counting starts on Monday)
		expect(addWorkingDays(new Date('2026-11-21T10:00:00Z'), 2).toISOString()).toMatch(/^2026-11-25/)
		expect(addWorkingDays(new Date('2026-11-18T10:00:00Z'), 0).toISOString()).toMatch(/^2026-11-18/)
	})

	it('counts from shipping, or from payment plus a day for packing', () => {
		const settings = defaultSettings()
		const standard = { id: 'standard' } // 3–5 working days by default
		const shipped = {
			status: 'shipped',
			shippingMethod: standard,
			shippedAt: new Date('2026-11-18T10:00:00Z'), // Wednesday
			payment: { paidAt: new Date('2026-11-17T10:00:00Z') },
		}
		expect(estimateDelivery(shipped, settings)).toEqual({ from: '2026-11-23', to: '2026-11-25' })

		const paid = { ...shipped, status: 'paid', shippedAt: undefined }
		expect(estimateDelivery(paid, settings)).toEqual({ from: '2026-11-23', to: '2026-11-25' })

		expect(estimateDelivery({ ...shipped, status: 'delivered' }, settings)).toBeNull()
		expect(estimateDelivery({ status: 'pending', payment: {} }, settings)).toBeNull()
	})
})

describe('setting the tracking number', () => {
	const parcel = { carrier: 'inpost', number: '620000111222333444555666' }

	it('is stored when staff marks the order shipped, with a generated link', async () => {
		const product = await createProduct()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const alice = await createUser({ username: 'alice' })
		const order = await placeOrder(alice.auth, product, 'locker')
		await setStatus(admin.auth, order._id, { status: 'paid' }).expect(200)

		// tracking only goes with "shipped"
		await setStatus(admin.auth, order._id, { status: 'cancelled', tracking: parcel }).expect(400)

		const { body } = await setStatus(admin.auth, order._id, {
			status: 'shipped',
			tracking: parcel,
		}).expect(200)
		expect(body.tracking).toMatchObject({
			...parcel,
			url: `https://inpost.pl/sledzenie-przesylek?number=${parcel.number}`,
		})

		// the customer sees it with the expected delivery dates
		const mine = await api().get(`/api/orders/${order._id}`).set(alice.auth).expect(200)
		expect(mine.body.tracking.number).toBe(parcel.number)
		expect(mine.body.estimatedDelivery).toEqual({
			from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
		})
		// the activity log records the parcel with the status change
		await expect
			.poll(() => ActivityLog.findOne({ action: 'order.status', details: /^shipped/ }).lean())
			.toMatchObject({ details: `shipped, inpost ${parcel.number}` })
	})

	it('can be added or corrected later by staff with the orders permission only', async () => {
		const product = await createProduct()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const packer = await createUser({ username: 'packer', permissions: ['orders'] })
		const writer = await createUser({ username: 'writer', permissions: ['products'] })
		const alice = await createUser({ username: 'alice' })
		const order = await placeOrder(alice.auth, product)
		const url = `/api/admin/orders/${order._id}/tracking`
		const corrected = { carrier: 'other', number: 'XY-123', url: 'https://track.example.com/XY' }

		// not shipped yet
		await api().patch(url).set(admin.auth).send(parcel).expect(409)
		await setStatus(admin.auth, order._id, { status: 'paid' }).expect(200)
		await setStatus(admin.auth, order._id, { status: 'shipped' }).expect(200)

		await api().patch(url).send(corrected).expect(401)
		await api().patch(url).set(alice.auth).send(corrected).expect(403)
		await api().patch(url).set(writer.auth).send(corrected).expect(403)
		const { body } = await api().patch(url).set(packer.auth).send(corrected).expect(200)
		expect(body.tracking).toMatchObject(corrected)

		await expect
			.poll(() => ActivityLog.findOne({ action: 'order.tracking' }).lean())
			.toMatchObject({ details: 'other XY-123', target: { kind: 'order' } })
	})

	it('rejects invalid tracking data', async () => {
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const url = `/api/admin/orders/665f1c2e9b1e8a0012345678/tracking`
		const { body } = await api()
			.patch(url)
			.set(admin.auth)
			.send({ carrier: 'ups', number: '<b>', url: 'javascript:alert(1)' })
			.expect(400)
		expect(body.details.map((detail) => detail.path)).toEqual(
			expect.arrayContaining(['carrier', 'number', 'url']),
		)
		await api().patch(url).set(admin.auth).send(parcel).expect(404)
	})
})
