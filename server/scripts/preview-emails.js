/**
 * Prints every customer email in English and Polish with sample data:
 * `node --env-file=.env scripts/preview-emails.js [en|pl] [--html]`
 * No database needed; the shop settings are the defaults.
 */
import mongoose from 'mongoose'
import { SHOP_DEFAULTS } from '../src/config/shop.js'
import { ORDER_EMAIL_KINDS, buildOrderEmail } from '../src/services/orderEmails.js'
import { buildReturnEmail } from '../src/services/returns.js'
import { buildBackInStockEmail } from '../src/services/stockAlerts.js'

const settings = structuredClone({
	...SHOP_DEFAULTS,
	shopName: 'Clothe Shop',
	contactEmail: 'hello@example.com',
})
const args = process.argv.slice(2)
const locales = args.filter((arg) => ['en', 'pl'].includes(arg))
const showHtml = args.includes('--html')

const order = {
	_id: new mongoose.Types.ObjectId(),
	user: new mongoose.Types.ObjectId(),
	email: 'anna@example.com',
	createdAt: new Date(),
	items: [
		{
			quantity: 1,
			brand: 'Northline',
			title: 'Essential White Tee',
			color: 'white',
			size: 'M',
			price: 99.99,
		},
		{
			quantity: 2,
			brand: 'Indigo Works',
			title: 'Classic Jeans',
			color: 'blue',
			size: '30',
			price: 579.99,
		},
		{
			quantity: 1,
			brand: 'Velo',
			title: 'Rib Knit Beanie',
			color: 'gray',
			size: 'One size',
			price: 79.99,
		},
	],
	subtotal: 1339.96,
	discount: 133.99,
	promoCode: 'WELCOME10',
	shipping: 0,
	shippingMethod: { id: 'locker', label: 'Parcel locker' },
	amount: 1205.97,
	address: {
		fullName: 'Anna Kowalska',
		street: 'ul. Długa 5/2',
		postalCode: '00-238',
		city: 'Warszawa',
		country: 'Polska',
	},
	payment: { paidAt: new Date() },
	tracking: {
		carrier: 'inpost',
		number: '620123456789012345678901',
		url: 'https://inpost.pl/sledzenie-przesylek?number=620123456789012345678901',
	},
	returnRequest: {
		items: [{ quantity: 2, title: 'Classic Jeans', color: 'blue', size: '30' }],
		refundAmount: 1043.98,
		refundedOnline: true,
		note: '',
	},
}
const product = { brand: 'Aster & Co', title: 'Sky Blue Wool Coat', slug: 'sky-blue-wool-coat' }

const print = ({ subject, text, html }) => {
	console.log(`Subject: ${subject}\n\n${text}${showHtml ? `\n\n${html}` : ''}\n${'='.repeat(72)}`)
}

for (const locale of locales.length ? locales : ['en', 'pl']) {
	console.log(`\n######## ${locale.toUpperCase()} ########\n`)
	for (const kind of ORDER_EMAIL_KINDS) print(buildOrderEmail(order, kind, { locale, settings }))
	for (const status of ['requested', 'approved', 'rejected', 'refunded']) {
		print(buildReturnEmail(order, status, { locale, settings }))
	}
	print(buildBackInStockEmail(product, { color: 'blue', size: 'M' }, { locale, settings }))
}
