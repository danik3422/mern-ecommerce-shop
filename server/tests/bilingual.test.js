import mongoose from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Order } from '../src/models/Order.js'
import { Product } from '../src/models/Product.js'
import { StockAlert } from '../src/models/StockAlert.js'
import { User } from '../src/models/User.js'
import { formatters } from '../src/services/emails/format.js'
import { sendMail } from '../src/services/mailer.js'
import { migrateDescriptionsToLocalized } from '../src/services/migrations.js'
import { sendOrderEmail } from '../src/services/orderEmails.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

vi.mock('../src/services/mailer.js', () => ({ sendMail: vi.fn() }))

const productBody = (overrides = {}) => ({
	title: 'Leather Jacket',
	slug: 'leather-jacket',
	brand: 'Aster & Co',
	description: { en: 'Classic biker jacket in soft leather.', pl: 'Klasyczna ramoneska ze skóry.' },
	categories: ['coats'],
	variants: [
		{ color: 'black', images: ['/images/products/a.jpg'], sizes: [{ label: 'M', stock: 3 }] },
	],
	price: 899.99,
	...overrides,
})

const sentMails = () => vi.mocked(sendMail).mock.calls.map(([mail]) => mail)

beforeEach(() => vi.mocked(sendMail).mockClear())

describe('product descriptions in English and Polish', () => {
	it('stores both languages and returns them from the public API', async () => {
		const admin = await createUser({ isAdmin: true })
		const { body } = await api()
			.post('/api/products')
			.set(admin.auth)
			.send(productBody())
			.expect(201)
		expect(body.description).toEqual({
			en: 'Classic biker jacket in soft leather.',
			pl: 'Klasyczna ramoneska ze skóry.',
		})

		const { body: shown } = await api().get('/api/products/leather-jacket').expect(200)
		expect(shown.description.pl).toBe('Klasyczna ramoneska ze skóry.')
	})

	it('requires English, makes Polish optional and accepts a plain string as English', async () => {
		const admin = await createUser({ isAdmin: true })
		const create = (body) => api().post('/api/products').set(admin.auth).send(body)

		const missingEn = await create(productBody({ description: { en: ' ', pl: 'Tylko po polsku' } }))
		expect(missingEn.status).toBe(400)
		expect(missingEn.body.details).toContainEqual(
			expect.objectContaining({ path: 'description.en' }),
		)

		const tooLong = await create(productBody({ description: { en: 'Ok', pl: 'x'.repeat(4001) } }))
		expect(tooLong.status).toBe(400)
		expect(tooLong.body.details[0].path).toBe('description.pl')

		const unknownLanguage = await create(productBody({ description: { en: 'Ok', de: 'Gut' } }))
		expect(unknownLanguage.status).toBe(400)

		const { body: englishOnly } = await create(
			productBody({ slug: 'en-only', description: { en: 'Only English' } }),
		).expect(201)
		expect(englishOnly.description).toEqual({ en: 'Only English', pl: '' })

		const { body: plain } = await create(
			productBody({ slug: 'plain', description: 'Plain text' }),
		).expect(201)
		expect(plain.description).toEqual({ en: 'Plain text', pl: '' })
	})

	it('reads products saved with the old string description, and the migration converts them', async () => {
		const product = await createProduct({ slug: 'old-coat' })
		await Product.collection.updateOne(
			{ _id: product._id },
			{ $set: { description: 'Saved before translations' } },
		)

		const { body } = await api().get('/api/products/old-coat').expect(200)
		expect(body.description).toEqual({ en: 'Saved before translations', pl: '' })
		// documents loaded through Mongoose (not lean) are converted as well
		expect((await Product.findById(product._id)).description.en).toBe('Saved before translations')

		expect(await migrateDescriptionsToLocalized()).toBe(1)
		const raw = await Product.collection.findOne({ _id: product._id })
		expect(raw.description).toEqual({ en: 'Saved before translations', pl: '' })
		// idempotent
		expect(await migrateDescriptionsToLocalized()).toBe(0)
	})

	it('finds products by words of the Polish description', async () => {
		const admin = await createUser({ isAdmin: true })
		await api().post('/api/products').set(admin.auth).send(productBody()).expect(201)
		await createProduct({ title: 'Plain Tee', description: { en: 'Cotton', pl: 'Bawełna' } })

		const search = async (q) =>
			(await api().get('/api/products').query({ q }).expect(200)).body.items.map((p) => p.title)
		expect(await search('ramoneska')).toEqual(['Leather Jacket'])
		// diacritics are optional, as everywhere in search
		expect(await search('skory')).toEqual(['Leather Jacket'])
		expect(await search('biker')).toEqual(['Leather Jacket'])
	})

	it('lets the admin list products without a Polish description', async () => {
		const admin = await createUser({ isAdmin: true })
		await createProduct({ title: 'Translated', description: { en: 'Coat', pl: 'Płaszcz' } })
		await createProduct({ title: 'English only', description: 'Coat' })

		const { body } = await api()
			.get('/api/admin/products?translation=missing_pl')
			.set(admin.auth)
			.expect(200)
		expect(body.items.map((p) => p.title)).toEqual(['English only'])
	})
})

describe('customer language', () => {
	it('is stored at sign-up and changed with PATCH /users/me', async () => {
		const res = await api()
			.post('/api/auth/register')
			.send({ username: 'ola', email: 'ola@example.com', password: 'password123', locale: 'pl' })
			.expect(201)
		expect(res.body.user.locale).toBe('pl')

		const auth = { Authorization: `Bearer ${res.body.accessToken}` }
		const { body } = await api().patch('/api/users/me').set(auth).send({ locale: 'en' }).expect(200)
		expect(body.locale).toBe('en')
		await api().patch('/api/users/me').set(auth).send({ locale: 'de' }).expect(400)
	})

	it('can be switched by shared demo accounts, whose profile is otherwise locked', async () => {
		const { user, auth } = await createUser()
		await User.updateOne({ _id: user._id }, { isDemo: true })
		await api().patch('/api/users/me').set(auth).send({ locale: 'pl' }).expect(200)
		await api().patch('/api/users/me').set(auth).send({ username: 'other' }).expect(403)
	})
})

describe('emails in the customer language', () => {
	const order = (product, extra) => ({
		items: [{ productId: product.id, color: 'black', size: 'M', quantity: 2 }],
		address: { ...validAddress, fullName: 'Anna Kowalska' },
		...extra,
	})

	it('sends a guest order confirmation in Polish when the order was placed in Polish', async () => {
		const product = await createProduct({ title: 'Coat', price: 649.5 })
		const { body } = await api()
			.post('/api/orders')
			.send(order(product, { email: 'anna@example.com', locale: 'pl' }))
			.expect(201)
		expect(body.order.locale).toBe('pl')

		const [mail] = sentMails()
		expect(mail.subject).toMatch(/^Otrzymaliśmy Twoje zamówienie #[0-9A-F]{8}$/)
		expect(mail.text).toContain('Dzień dobry, Anna!')
		expect(mail.text).toContain('2 × Brand Coat (czarny, M) — 1\u00a0299,00\u00a0zł')
		expect(mail.text).toMatch(/Twoje zamówienie \(2 sztuki\)/)
		expect(mail.text).toContain('zespół Clothe Shop')
		expect(mail.html).toContain('<html lang="pl">')
	})

	it('uses the account language when the checkout does not send one', async () => {
		const product = await createProduct({ title: 'Coat', price: 10 })
		const { user, auth } = await createUser()
		await User.updateOne({ _id: user._id }, { locale: 'pl' })
		await api().post('/api/orders').set(auth).send(order(product)).expect(201)
		expect(sentMails()[0].subject).toMatch(/^Otrzymaliśmy/)
	})

	it('sends English emails with English amounts, and status emails in the order language', async () => {
		const product = await createProduct({ title: 'Coat', price: 1000 })
		const admin = await createUser({ username: 'admin', isAdmin: true })
		const placed = await api()
			.post('/api/orders')
			.send(order(product, { email: 'guest@example.com', locale: 'en' }))
			.expect(201)
		expect(sentMails()[0].text).toContain(`2 × Brand Coat (black, M) — PLN${' '}2,000.00`)

		const pl = await api()
			.post('/api/orders')
			.send(order(product, { email: 'gosia@example.com', locale: 'pl' }))
			.expect(201)
		vi.mocked(sendMail).mockClear()
		for (const id of [placed.body.order._id, pl.body.order._id]) {
			await api().patch(`/api/orders/${id}/status`).set(admin.auth).send({ status: 'paid' })
		}
		expect(sentMails().map((mail) => mail.subject.replace(/#\w+/, '#N'))).toEqual([
			'Payment received for order #N',
			'Otrzymaliśmy płatność za zamówienie #N',
		])
	})

	it('includes the tracking link in the "shipped" email', async () => {
		const product = await createProduct({ title: 'Coat' })
		const { body } = await api()
			.post('/api/orders')
			.send(order(product, { email: 'anna@example.com', locale: 'pl' }))
			.expect(201)
		await Order.collection.updateOne(
			{ _id: new mongoose.Types.ObjectId(String(body.order._id)) },
			{
				$set: {
					tracking: { carrier: 'inpost', number: '6200123', url: 'https://inpost.pl/t?n=6200123' },
				},
			},
		)
		vi.mocked(sendMail).mockClear()
		await sendOrderEmail(body.order._id, 'shipped')

		const [mail] = sentMails()
		expect(mail.subject).toMatch(/jest już w drodze$/)
		expect(mail.text).toContain('Przewoźnik: InPost')
		expect(mail.text).toContain('Numer przesyłki: 6200123')
		expect(mail.text).toContain('Śledź przesyłkę: https://inpost.pl/t?n=6200123')
		expect(mail.html).toContain('href="https://inpost.pl/t?n=6200123"')
	})

	it('sends the back-in-stock email in the language of the alert', async () => {
		const product = await createProduct({
			title: 'Coat',
			colors: ['black'],
			sizes: [{ label: 'M', stock: 0 }],
		})
		const subscribe = (body, auth = {}) =>
			api().post(`/api/products/${product.id}/stock-alerts`).set(auth).send(body).expect(201)
		await subscribe({ size: 'M', email: 'pl@example.com', locale: 'pl' })
		await subscribe({ size: 'M', email: 'en@example.com' })
		// signed-in customers default to their account language
		const { user, auth } = await createUser({ username: 'ola' })
		await User.updateOne({ _id: user._id }, { locale: 'pl' })
		await subscribe({ size: 'M' }, auth)
		expect((await StockAlert.findOne({ email: 'ola@example.com' })).locale).toBe('pl')

		await Product.updateOne({ _id: product._id }, { 'variants.0.sizes.0.stock': 3 })
		const { notifyRestocked } = await import('../src/services/stockAlerts.js')
		await notifyRestocked([product._id])

		const byEmail = Object.fromEntries(sentMails().map((mail) => [mail.to, mail.subject]))
		expect(byEmail).toEqual({
			'pl@example.com': 'Znowu dostępne: Brand Coat (czarny, M)',
			'en@example.com': 'Back in stock: Brand Coat (black, M)',
			'ola@example.com': 'Znowu dostępne: Brand Coat (czarny, M)',
		})
	})
})

describe('email formatting', () => {
	it('formats amounts, dates and plural forms per language', () => {
		const pl = formatters('pl')
		const en = formatters('en')
		expect(pl.money(1234.56)).toBe('1 234,56 zł')
		expect(en.money(1234.56)).toBe('PLN 1,234.56')
		expect(pl.date('2026-03-05T12:00:00Z')).toBe('5 marca 2026')
		expect(en.date('2026-03-05T12:00:00Z')).toBe('5 March 2026')

		const forms = { one: '{count} sztuka', few: '{count} sztuki', many: '{count} sztuk' }
		expect([1, 3, 5, 22].map((n) => pl.plural(n, { ...forms, other: '{count} sztuki' }))).toEqual([
			'1 sztuka',
			'3 sztuki',
			'5 sztuk',
			'22 sztuki',
		])
		// unknown languages fall back to English
		expect(formatters('de').money(1)).toBe(en.money(1))
	})
})
