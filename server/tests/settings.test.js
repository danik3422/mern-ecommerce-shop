import { beforeEach, describe, expect, it } from 'vitest'
import { ShopSettings } from '../src/models/ShopSettings.js'
import { clearShopSettingsCache } from '../src/services/shopSettings.js'
import { api, createProduct, createUser, stockOf, validAddress } from './helpers.js'
import { defaultSettings } from './pricingHelpers.js'

/** The body the admin settings page sends: everything except the read-only currency. */
const editable = () => {
	const { currency: _currency, ...settings } = defaultSettings()
	return settings
}

const line = (product, quantity = 1) => ({
	productId: product.id,
	quantity,
	color: 'black',
	size: 'M',
})

describe('shop settings', () => {
	let admin
	beforeEach(async () => {
		admin = await createUser({ username: 'admin', isAdmin: true })
	})

	const save = (body) => api().put('/api/admin/settings').set(admin.auth).send(body)

	it('is only available to admins', async () => {
		const customer = await createUser({ username: 'alice' })
		await api().get('/api/admin/settings').expect(401)
		await api().get('/api/admin/settings').set(customer.auth).expect(403)
		await api().put('/api/admin/settings').set(customer.auth).send(editable()).expect(403)
	})

	it('starts with the defaults and saves changes', async () => {
		const { body } = await api().get('/api/admin/settings').set(admin.auth).expect(200)
		expect(body).toEqual(defaultSettings())

		const changes = {
			...editable(),
			shopName: 'Clothe Warsaw',
			contactEmail: ' Hello@Example.com ',
			contactPhone: '+48 123 456 789',
			announcement: { en: 'Winter sale', pl: 'Zimowa wyprzedaż' },
			returnWindowDays: 14,
			lowStockThreshold: 5,
		}
		const saved = await save(changes).expect(200)
		expect(saved.body).toMatchObject({
			currency: 'PLN',
			shopName: 'Clothe Warsaw',
			contactEmail: 'hello@example.com',
			returnWindowDays: 14,
			lowStockThreshold: 5,
		})

		// stored in the database, not only in the cache
		clearShopSettingsCache()
		const reloaded = await api().get('/api/admin/settings').set(admin.auth).expect(200)
		expect(reloaded.body).toEqual(saved.body)
		expect(await ShopSettings.countDocuments()).toBe(1)
	})

	it('rejects invalid values with field errors', async () => {
		const settings = editable()
		settings.shippingMethods[0].price = -1
		settings.shippingMethods[1].days = [4, 2]
		settings.shippingMethods[2].label.pl = ''
		const { body } = await save({
			...settings,
			shopName: '',
			contactEmail: 'not-an-email',
			returnWindowDays: 0,
			lowStockThreshold: 2.5,
		}).expect(400)

		const paths = body.details.map((detail) => detail.path)
		expect(paths).toEqual(
			expect.arrayContaining([
				'shopName',
				'contactEmail',
				'returnWindowDays',
				'lowStockThreshold',
				'shippingMethods.0.price',
				'shippingMethods.1.days.1',
				'shippingMethods.2.label.pl',
			]),
		)

		// methods cannot be added, removed or all disabled; the currency is not editable
		const twoMethods = { ...editable(), shippingMethods: editable().shippingMethods.slice(1) }
		await save(twoMethods).expect(400)
		const allOff = editable()
		for (const method of allOff.shippingMethods) method.enabled = false
		expect((await save(allOff).expect(400)).body.details[0].path).toBe('shippingMethods')
		await save({ ...editable(), currency: 'EUR' }).expect(400)
	})

	it('publishes the storefront part in the shop config', async () => {
		const settings = editable()
		settings.shippingMethods[2].enabled = false
		settings.shippingMethods[0].label = { en: 'Courier', pl: 'Kurier' }
		await save({
			...settings,
			freeShippingFrom: 0,
			contactEmail: 'shop@example.com',
			announcement: { en: 'Free returns', pl: '' },
		}).expect(200)

		const { body } = await api().get('/api/shop/config').expect(200)
		expect(body).toMatchObject({
			currency: 'PLN',
			freeShippingFrom: null,
			returnWindowDays: 30,
			shopName: 'Clothe Shop',
			contact: { email: 'shop@example.com', phone: '' },
			announcement: { en: 'Free returns', pl: '' },
		})
		expect(body.shippingMethods.map((method) => method.id)).toEqual(['standard', 'locker'])
		expect(body.shippingMethods[0]).toEqual({
			id: 'standard',
			label: 'Courier',
			labels: { en: 'Courier', pl: 'Kurier' },
			price: 14.99,
			freeShipping: true,
			days: [3, 5],
		})
		expect(body).not.toHaveProperty('shippingMethods.0.enabled')
	})

	describe('at checkout', () => {
		let product
		beforeEach(async () => {
			product = await createProduct({ price: 60, sizes: [{ label: 'M', stock: 5 }] })
		})

		const quote = (body) => api().post('/api/checkout/quote').send(body)

		it('uses the saved free-shipping threshold and delivery prices', async () => {
			const settings = editable()
			settings.shippingMethods[0].price = 12.5
			await save({ ...settings, freeShippingFrom: 100 }).expect(200)

			const below = await quote({ items: [line(product)] }).expect(200)
			expect(below.body).toMatchObject({ subtotal: 60, shipping: 12.5, amount: 72.5 })
			const above = await quote({ items: [line(product, 2)] }).expect(200)
			expect(above.body).toMatchObject({ subtotal: 120, shipping: 0, amount: 120 })

			await save({ ...settings, freeShippingFrom: null }).expect(200)
			const noFree = await quote({ items: [line(product, 2)] }).expect(200)
			expect(noFree.body.shipping).toBe(12.5)
		})

		it('rejects a disabled delivery method for quotes and orders', async () => {
			const settings = editable()
			settings.shippingMethods[0].enabled = false
			await save(settings).expect(200)

			const rejected = await quote({ items: [line(product)], shippingMethod: 'standard' }).expect(
				400,
			)
			expect(rejected.body.details).toEqual([
				{ path: 'shippingMethod', message: expect.any(String) },
			])
			// without a choice the first enabled method is used
			const fallback = await quote({ items: [line(product)] }).expect(200)
			expect(fallback.body.shippingMethod.id).toBe('locker')

			const { auth } = await createUser({ username: 'bob' })
			await api()
				.post('/api/orders')
				.set(auth)
				.send({ items: [line(product)], address: validAddress, shippingMethod: 'standard' })
				.expect(400)
			// rejected before any stock was reserved
			expect(await stockOf(product.id, 'black', 'M')).toBe(5)
		})
	})
})
