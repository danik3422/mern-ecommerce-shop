import { describe, expect, it } from 'vitest'
import { Order } from '../src/models/Order.js'
import { buildInvoice, issueInvoice, nextInvoiceNumber } from '../src/services/invoices.js'
import { buildOrderEmail } from '../src/services/orderEmails.js'
import { invoiceUrl, orderPageUrl } from '../src/services/orderLinks.js'
import { getShopSettings, updateShopSettings } from '../src/services/shopSettings.js'
import { allocate, splitGross, sumLines } from '../src/services/vat.js'
import {
	formatBankAccount,
	isValidBankAccount,
	isValidNip,
	normalizeNip,
} from '../src/validation/taxIds.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'
import { defaultSettings } from './pricingHelpers.js'

const placeOrder = async (auth, product, { quantity = 1, promoCode } = {}) => {
	const res = await api()
		.post('/api/orders')
		.set(auth)
		.send({
			items: [{ productId: product.id, quantity, color: 'black', size: 'M' }],
			address: validAddress,
			...(promoCode && { promoCode }),
		})
		.expect(201)
	return res.body.order
}

const setStatus = (admin, orderId, status) =>
	api().patch(`/api/orders/${orderId}/status`).set(admin.auth).send({ status }).expect(200)

describe('NIP and bank account validation', () => {
	it('accepts NIPs with a valid checksum, with or without dashes and the PL prefix', () => {
		expect(isValidNip('1234563218')).toBe(true)
		expect(isValidNip('526-025-02-74')).toBe(true)
		expect(isValidNip('PL 526 025 02 74')).toBe(true)
		expect(normalizeNip('PL 526-025-02-74')).toBe('5260250274')
	})

	it('rejects wrong checksums, lengths and characters', () => {
		expect(isValidNip('1234563217')).toBe(false)
		expect(isValidNip('123456321')).toBe(false)
		expect(isValidNip('12345632189')).toBe(false)
		expect(isValidNip('12345A3218')).toBe(false)
		// the weighted sum of 123456789… gives 10, which is never a valid check digit
		expect(isValidNip('1234567890')).toBe(false)
		expect(isValidNip('')).toBe(false)
	})

	it('checks Polish account numbers with the IBAN checksum', () => {
		expect(isValidBankAccount('PL61 1090 1014 0000 0712 1981 2874')).toBe(true)
		expect(isValidBankAccount('61109010140000071219812874')).toBe(true)
		expect(isValidBankAccount('62109010140000071219812874')).toBe(false)
		expect(isValidBankAccount('6110901014000007121981287')).toBe(false)
		expect(formatBankAccount('61109010140000071219812874')).toBe('61 1090 1014 0000 0712 1981 2874')
	})
})

describe('VAT math', () => {
	it('splits gross amounts into net and 23% VAT, rounded to the grosz', () => {
		expect(splitGross(12300)).toEqual({ net: 10000, vat: 2300, gross: 12300 })
		// 19.99 PLN: 16.25 net (16.252…) + 3.74 VAT
		expect(splitGross(1999)).toEqual({ net: 1625, vat: 374, gross: 1999 })
		expect(splitGross(1)).toEqual({ net: 1, vat: 0, gross: 1 })
		expect(splitGross(0)).toEqual({ net: 0, vat: 0, gross: 0 })
	})

	it('spreads a discount over lines in whole grosze that add up exactly', () => {
		expect(allocate([1000, 2000, 3000], 600)).toEqual([100, 200, 300])
		const parts = allocate([999, 999, 999], 100)
		expect(parts.reduce((a, b) => a + b, 0)).toBe(100)
		expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1)
		expect(allocate([500, 0], 0)).toEqual([0, 0])
	})

	it('keeps net + VAT = gross for every line and for the totals', () => {
		for (let seed = 1; seed < 200; seed++) {
			const lines = [seed * 37, seed * 101 + 13, seed * 7 + 1].map((gross) => splitGross(gross))
			const totals = sumLines(lines)
			expect(totals.net + totals.vat).toBe(totals.gross)
			expect(totals.gross).toBe(lines.reduce((sum, line) => sum + line.gross, 0))
			expect(totals.byRate).toHaveLength(1)
		}
	})

	it('builds invoice lines whose totals match the order amount', async () => {
		const settings = defaultSettings()
		const order = {
			_id: { toString: () => '665f1c2e9b1e8a0012345678' },
			createdAt: new Date(),
			email: 'a@example.com',
			address: validAddress,
			items: [
				{ brand: 'Aster', title: 'Coat', color: 'black', size: 'M', quantity: 3, price: 33.33 },
				{ brand: 'Aster', title: 'Tee', color: 'white', size: 'S', quantity: 1, price: 19.99 },
			],
			subtotal: 119.98,
			discount: 12,
			shipping: 14.99,
			shippingMethod: { id: 'standard', label: 'Standard delivery' },
			amount: 122.97,
			payment: { provider: 'none', paidAt: new Date() },
			invoice: { number: 'FV/2026/11/0001', issuedAt: new Date(), saleDate: new Date() },
		}
		const invoice = buildInvoice(order, settings)

		expect(invoice.lines).toHaveLength(3)
		expect(invoice.lines[2]).toMatchObject({ kind: 'shipping', gross: 14.99, net: 12.19 })
		expect(invoice.lines[0].discount + invoice.lines[1].discount).toBeCloseTo(12, 10)
		expect(invoice.totals.gross).toBe(122.97)
		const cents = (value) => Math.round(value * 100)
		expect(cents(invoice.totals.net) + cents(invoice.totals.vat)).toBe(12297)
		for (const line of invoice.lines) {
			expect(cents(line.net) + cents(line.vat)).toBe(cents(line.gross))
		}
		// without company data the shop name is the seller
		expect(invoice.seller.name).toBe(settings.shopName)
		expect(invoice.payment).toMatchObject({ method: 'onDelivery', paid: true })
	})
})

describe('invoice numbers', () => {
	it('are sequential within a month and start again the next month', async () => {
		const november = new Date('2026-11-15T12:00:00Z')
		expect(await nextInvoiceNumber(november)).toBe('FV/2026/11/0001')
		expect(await nextInvoiceNumber(november)).toBe('FV/2026/11/0002')
		expect(await nextInvoiceNumber(new Date('2026-12-01T09:00:00Z'))).toBe('FV/2026/12/0001')
		expect(await nextInvoiceNumber(november)).toBe('FV/2026/11/0003')
	})

	it('follow the Polish time zone at the turn of the month', async () => {
		// 23:30 UTC on 31 October is already 00:30 on 1 November in Warsaw
		expect(await nextInvoiceNumber(new Date('2026-10-31T23:30:00Z'))).toBe('FV/2026/11/0001')
	})

	it('never repeat when requested concurrently', async () => {
		const date = new Date('2027-01-10T10:00:00Z')
		const numbers = await Promise.all(Array.from({ length: 25 }, () => nextInvoiceNumber(date)))
		expect(new Set(numbers).size).toBe(25)
		expect(numbers.toSorted()).toEqual(
			Array.from({ length: 25 }, (_, i) => `FV/2027/01/${String(i + 1).padStart(4, '0')}`),
		)
	})

	it('are issued once per order, even when issued concurrently', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const order = await placeOrder(auth, product)
		const doc = await Order.findById(order._id)

		const issued = await Promise.all([issueInvoice(doc), issueInvoice(doc), issueInvoice(doc)])
		const numbers = new Set(issued.map((o) => o.invoice.number))
		expect(numbers.size).toBe(1)
		expect((await Order.findById(order._id)).invoice.number).toBe([...numbers][0])
	})
})

describe('GET /api/orders/:id/invoice', () => {
	it('is issued when the order is paid and numbered in payment order', async () => {
		const product = await createProduct({ price: 50 })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const alice = await createUser({ username: 'alice' })
		const first = await placeOrder(alice.auth, product)
		const second = await placeOrder(alice.auth, product)

		// no invoice while the order is unpaid
		await api().get(`/api/orders/${first._id}/invoice`).set(alice.auth).expect(404)

		await setStatus(admin, second._id, 'paid')
		await setStatus(admin, first._id, 'paid')

		const a = await api().get(`/api/orders/${second._id}/invoice`).set(alice.auth).expect(200)
		const b = await api().get(`/api/orders/${first._id}/invoice`).set(alice.auth).expect(200)
		expect(a.body.number).toMatch(/^FV\/\d{4}\/\d{2}\/0001$/)
		expect(b.body.number).toMatch(/^FV\/\d{4}\/\d{2}\/0002$/)
		expect(a.body).toMatchObject({
			currency: 'PLN',
			buyer: { name: validAddress.fullName, city: validAddress.city },
			payment: { paid: true },
			totals: { gross: 50 + 14.99 },
		})

		// shipping and delivery keep the number
		await setStatus(admin, second._id, 'shipped')
		const again = await api().get(`/api/orders/${second._id}/invoice`).set(alice.auth).expect(200)
		expect(again.body.number).toBe(a.body.number)
	})

	it('is available to the customer, staff with orders permission and the guest with the token', async () => {
		const product = await createProduct()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const packer = await createUser({ username: 'packer', permissions: ['orders'] })
		const writer = await createUser({ username: 'writer', permissions: ['products'] })
		const order = await placeOrder(alice.auth, product)
		await setStatus(admin, order._id, 'paid')
		const url = `/api/orders/${order._id}/invoice`

		await api().get(url).set(alice.auth).expect(200)
		await api().get(url).set(packer.auth).expect(200)
		await api().get(url).set(admin.auth).expect(200)
		await api().get(url).set(bob.auth).expect(404)
		await api().get(url).set(writer.auth).expect(404)
		await api().get(url).expect(404)

		const guest = await api()
			.post('/api/orders')
			.send({
				items: [{ productId: product.id, quantity: 1, color: 'black', size: 'M' }],
				address: validAddress,
				email: 'guest@example.com',
			})
			.expect(201)
		const guestUrl = `/api/orders/${guest.body.order._id}/invoice`
		await setStatus(admin, guest.body.order._id, 'paid')
		await api().get(guestUrl).set('X-Order-Token', guest.body.accessToken).expect(200)
		await api().get(guestUrl).set('X-Order-Token', 'wrong-token').expect(404)
	})

	it('shows the seller from the shop settings', async () => {
		await updateShopSettings({
			company: {
				name: 'Clothe Shop sp. z o.o.',
				street: 'ul. Prosta 20',
				postalCode: '00-850',
				city: 'Warszawa',
				nip: '1234563218',
				bankAccount: '61109010140000071219812874',
			},
		})
		const product = await createProduct()
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const order = await placeOrder(admin.auth, product)
		await setStatus(admin, order._id, 'paid')

		const { body } = await api().get(`/api/orders/${order._id}/invoice`).set(admin.auth)
		expect(body.seller).toMatchObject({
			name: 'Clothe Shop sp. z o.o.',
			nip: '1234563218',
			bankAccount: '61 1090 1014 0000 0712 1981 2874',
		})
		expect(body.placeOfIssue).toBe('Warszawa')
	})

	it('is issued on request for orders paid before invoices existed, but not for cancelled ones', async () => {
		const product = await createProduct()
		const { auth } = await createUser()
		const paid = await placeOrder(auth, product)
		const cancelled = await placeOrder(auth, product)
		await Order.updateOne({ _id: paid._id }, { status: 'paid', 'payment.paidAt': new Date() })
		await Order.updateOne({ _id: cancelled._id }, { status: 'cancelled' })

		const { body } = await api().get(`/api/orders/${paid._id}/invoice`).set(auth).expect(200)
		expect(body.number).toMatch(/\/0001$/)
		await api().get(`/api/orders/${cancelled._id}/invoice`).set(auth).expect(404)
	})
})

describe('company settings', () => {
	it('validate the NIP, postal code and account number and keep them when omitted', async () => {
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const { currency: _currency, ...editable } = await getShopSettings()
		const company = {
			name: 'Clothe Shop sp. z o.o.',
			street: 'ul. Prosta 20',
			postalCode: '00850',
			city: 'Warszawa',
			nip: '1234563217',
			bankAccount: '12 3456',
		}
		const rejected = await api()
			.put('/api/admin/settings')
			.set(admin.auth)
			.send({ ...editable, company })
			.expect(400)
		expect(rejected.body.details.map((detail) => detail.path)).toEqual(
			expect.arrayContaining(['company.postalCode', 'company.nip', 'company.bankAccount']),
		)

		const saved = await api()
			.put('/api/admin/settings')
			.set(admin.auth)
			.send({
				...editable,
				company: {
					...company,
					postalCode: '00-850',
					nip: '123-456-32-18',
					bankAccount: 'PL61 1090 1014 0000 0712 1981 2874',
				},
			})
			.expect(200)
		expect(saved.body.company).toMatchObject({
			nip: '1234563218',
			bankAccount: '61109010140000071219812874',
		})

		// older clients that do not send the company keep it
		const { company: _company, ...withoutCompany } = editable
		const kept = await api()
			.put('/api/admin/settings')
			.set(admin.auth)
			.send(withoutCompany)
			.expect(200)
		expect(kept.body.company.nip).toBe('1234563218')
	})
})

describe('order email links', () => {
	const base = {
		_id: { toString: () => '665f1c2e9b1e8a0012345678' },
		createdAt: new Date(),
		email: 'anna@example.com',
		address: validAddress,
		items: [{ brand: 'Aster', title: 'Coat', color: 'black', size: 'M', quantity: 1, price: 50 }],
		subtotal: 50,
		discount: 0,
		shipping: 0,
		amount: 50,
		status: 'paid',
		payment: { provider: 'none', paidAt: new Date() },
		invoice: { number: 'FV/2026/11/0003', issuedAt: new Date(), saleDate: new Date() },
	}

	it('open the order page and the invoice; guests keep their token', async () => {
		const customer = { ...base, user: 'u1' }
		const guest = { ...base, accessToken: 'tok en' }
		expect(orderPageUrl(customer)).toMatch(/\/account\/orders\/665f1c2e9b1e8a0012345678$/)
		expect(orderPageUrl(guest)).toMatch(
			/\/checkout\/success\?order=665f1c2e9b1e8a0012345678&token=tok%20en$/,
		)
		expect(invoiceUrl(customer)).toMatch(/\/orders\/665f1c2e9b1e8a0012345678\/invoice$/)
		expect(invoiceUrl(guest)).toMatch(/\/invoice\?token=tok%20en$/)

		const settings = await getShopSettings()
		const paid = buildOrderEmail(customer, 'paid', { locale: 'pl', settings })
		expect(paid.text).toContain('Faktura FV/2026/11/0003')
		expect(paid.text).toContain('/orders/665f1c2e9b1e8a0012345678/invoice')
		expect(paid.text).toContain('/account/orders/665f1c2e9b1e8a0012345678')

		const delivered = buildOrderEmail(guest, 'delivered', { locale: 'en', settings })
		expect(delivered.text).toContain('Invoice FV/2026/11/0003')
		expect(delivered.text).toContain('/invoice?token=tok%20en')

		// no invoice link before the invoice exists, nor in other emails
		const { invoice: _invoice, ...unpaid } = customer
		expect(buildOrderEmail(unpaid, 'placed', { locale: 'en', settings }).text).not.toContain(
			'/invoice',
		)
	})
})
