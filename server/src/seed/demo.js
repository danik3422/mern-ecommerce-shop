/**
 * The public demo: shared demo accounts with realistic data, and the nightly reset that
 * puts the whole shop back into this state (see services/demoReset.js).
 */
import { randomBytes } from 'node:crypto'
import { SHOP_DEFAULTS } from '../config/shop.js'
import { ActivityLog } from '../models/ActivityLog.js'
import { Cart } from '../models/Cart.js'
import { Counter } from '../models/Counter.js'
import { Order } from '../models/Order.js'
import { PromoCode } from '../models/PromoCode.js'
import { Review } from '../models/Review.js'
import { Session } from '../models/Session.js'
import { ShopSettings } from '../models/ShopSettings.js'
import { StockAlert } from '../models/StockAlert.js'
import { User } from '../models/User.js'
import { hashPassword } from '../services/password.js'
import { nextInvoiceNumber } from '../services/invoices.js'
import { clearShopSettingsCache, updateShopSettings } from '../services/shopSettings.js'
import { toTracking } from '../services/tracking.js'
import { DEMO_REVIEWERS, seedCatalog, seedReviewers, seedReviews } from './catalog.js'

/**
 * Accounts anyone can open with one click on the sign-in page (POST /auth/demo).
 * The demo admin is staff with limited access: no team, settings, customers or promo codes.
 */
export const DEMO_ACCOUNTS = Object.freeze({
	customer: { username: 'demo', email: 'demo@example.com', role: 'customer' },
	admin: {
		username: 'demo-admin',
		email: 'demo-admin@example.com',
		role: 'staff',
		permissions: ['dashboard', 'analytics', 'products', 'orders', 'returns', 'reviews'],
	},
})

const DEMO_ADDRESS = {
	fullName: 'Anna Nowak',
	street: 'ul. Marszałkowska 10/4',
	postalCode: '00-590',
	city: 'Warszawa',
	country: 'Polska',
}
const SECOND_ADDRESS = {
	fullName: 'Anna Nowak',
	street: 'ul. Długa 21',
	postalCode: '80-831',
	city: 'Gdańsk',
	country: 'Polska',
}
const CITIES = [
	['Kraków', '31-042'],
	['Wrocław', '50-001'],
	['Poznań', '61-001'],
	['Łódź', '90-001'],
]

export const DEMO_PROMO_CODES = [
	{ code: 'WELCOME10', type: 'percent', value: 10, description: '10% off the first order' },
	{
		code: 'FREESHIP',
		type: 'free_shipping',
		minSubtotal: 100,
		description: 'Free delivery from 100 zł',
	},
	{
		code: 'MINUS50',
		type: 'fixed',
		value: 50,
		minSubtotal: 300,
		description: '50 zł off from 300 zł',
	},
]

/** More registered shoppers besides the reviewers, so the admin has a realistic customer base. */
export const DEMO_SHOPPERS = ['olivia', 'jakub', 'zofia', 'marek', 'hanna', 'piotr']

const DAY_MS = 24 * 60 * 60 * 1000
const roundMoney = (value) => Math.round(value * 100) / 100

/** Creates or resets one demo account; its random password is never used. */
const upsertDemoAccount = async ({ username, email, role, permissions }, extra = {}) =>
	User.findOneAndUpdate(
		{ username },
		{
			email,
			role,
			permissions: role === 'staff' ? permissions : undefined,
			isOwner: undefined,
			isDemo: true,
			blocked: false,
			passwordHash: await hashPassword(randomBytes(24).toString('hex')),
			...extra,
		},
		{ upsert: true, returnDocument: 'after' },
	)

/** The extra demo shoppers (random passwords: nobody signs in as them). */
const seedShoppers = () =>
	Promise.all(
		DEMO_SHOPPERS.map(async (username, i) =>
			User.findOneAndUpdate(
				{ username },
				{
					$setOnInsert: {
						email: `${username}@example.com`,
						passwordHash: await hashPassword(randomBytes(24).toString('hex')),
						// signed up over the last two months
						createdAt: new Date(Date.now() - (8 + i * 9) * DAY_MS),
					},
				},
				{ upsert: true, returnDocument: 'after', timestamps: false },
			),
		),
	)

/** The demo customer and the demo admin, back to their starting state. */
export const seedDemoAccounts = async (products) => {
	const wishlist = products
		.filter((p) => p.compareAtPrice)
		.slice(0, 3)
		.map((p) => p._id)
	const customer = await upsertDemoAccount(DEMO_ACCOUNTS.customer, {
		addresses: [
			{ ...DEMO_ADDRESS, isDefault: true },
			{ ...SECOND_ADDRESS, isDefault: false },
		],
		wishlist,
	})
	const admin = await upsertDemoAccount(DEMO_ACCOUNTS.admin, { addresses: [], wishlist: [] })
	return { customer, admin }
}

/** A size of the product's first color that is in stock. */
const pickOption = (product, offset = 0) => {
	const variant = product.variants[0]
	const sizes = variant.sizes.filter((size) => size.stock > 0)
	return { variant, size: (sizes[offset % sizes.length] ?? variant.sizes[0]).label }
}

const orderItem = (product, offset = 0, quantity = 1) => {
	const { variant, size } = pickOption(product, offset)
	return {
		productId: product._id,
		color: variant.color,
		size,
		quantity,
		title: product.title,
		brand: product.brand,
		image: variant.images[0],
		price: product.price,
	}
}

/** The demo seller printed on invoices (a made-up company with a valid NIP and account number). */
const DEMO_COMPANY = {
	name: 'Clothe Shop sp. z o.o.',
	street: 'ul. Prosta 20',
	postalCode: '00-850',
	city: 'Warszawa',
	nip: '1234563218',
	bankAccount: '11114020040000300212345678',
}

/** Carriers of the demo parcels by delivery method (parcel lockers go with InPost). */
const DEMO_CARRIERS = { locker: ['inpost'], standard: ['dpd', 'poczta', 'gls'], express: ['dhl'] }

/** A made-up parcel number in the carrier's usual format. */
const demoParcelNumber = (carrier, seed) => {
	const digits = (length) =>
		Array.from({ length }, (_, i) => (seed * 7919 + i * 104729) % 10).join('')
	if (carrier === 'poczta') return `00${digits(18)}`
	if (carrier === 'dhl') return `JJD${digits(15)}`
	return digits(carrier === 'inpost' ? 24 : 14)
}

/**
 * Parcels for shipped and delivered orders, and invoice numbers for every paid order —
 * numbered in the order of payment, through the same counter as real invoices.
 */
const addShipmentsAndInvoices = async (orders) => {
	orders.forEach((order, i) => {
		if (!order.shippedAt) return
		const options = DEMO_CARRIERS[order.shippingMethod.id]
		const carrier = options[i % options.length]
		order.tracking = toTracking(
			{ carrier, number: demoParcelNumber(carrier, i + 1) },
			order.shippedAt,
		)
	})
	const paid = orders
		.filter((order) => order.payment.paidAt)
		.sort((a, b) => a.payment.paidAt - b.payment.paidAt)
	for (const order of paid) {
		const issuedAt = order.payment.paidAt
		order.invoice = { number: await nextInvoiceNumber(issuedAt), issuedAt, saleDate: issuedAt }
	}
}

/**
 * An order as checkout would have saved it, `daysAgo` days in the past,
 * with the dates and status history of everything that happened since.
 */
const buildOrder = ({
	user,
	email,
	address,
	items,
	status,
	daysAgo,
	methodId = 'standard',
	promo,
}) => {
	const method = SHOP_DEFAULTS.shippingMethods.find((m) => m.id === methodId)
	const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
	const discount = promo?.type === 'percent' ? roundMoney((subtotal * promo.value) / 100) : 0
	const free =
		promo?.type === 'free_shipping' ||
		(method.freeShipping && subtotal - discount >= SHOP_DEFAULTS.freeShippingFrom)
	const shipping = free ? 0 : method.price
	const createdAt = new Date(Date.now() - daysAgo * DAY_MS)
	const after = (days) => new Date(createdAt.getTime() + days * DAY_MS)

	const steps = { pending: [], paid: ['paid'], shipped: ['paid', 'shipped'] }
	steps.delivered = [...steps.shipped, 'delivered']
	steps.cancelled = ['cancelled']
	const history = [
		{ status: 'pending', at: createdAt },
		...steps[status].map((step, i) => ({ status: step, at: after(Math.min(i * 1.5, daysAgo)) })),
	]
	const at = (step) => history.find((h) => h.status === step)?.at

	return {
		user,
		email,
		address,
		items,
		subtotal,
		discount,
		promoCode: promo?.code,
		shipping,
		shippingMethod: { id: method.id, label: method.label.en, price: method.price },
		amount: roundMoney(subtotal - discount + shipping),
		status,
		payment: { provider: 'none', paidAt: at('paid') },
		shippedAt: at('shipped'),
		deliveredAt: at('delivered'),
		statusHistory: history,
		createdAt,
		updatedAt: history.at(-1).at,
	}
}

/**
 * Orders of the demo customer (to try returns and reviews) and of the demo shoppers
 * over the last 30 days (for the admin dashboard, order filters and a return to handle).
 */
export const seedDemoOrders = async ({ products, customer, shoppers }) => {
	const byIndex = (i) => products[i % products.length]
	const mine = { user: customer._id, email: customer.email, address: DEMO_ADDRESS }
	const orders = [
		// delivered three days ago: can be returned, and its products reviewed
		buildOrder({
			...mine,
			items: [orderItem(byIndex(0), 1), orderItem(byIndex(5), 2)],
			status: 'delivered',
			daysAgo: 6,
		}),
		buildOrder({
			...mine,
			items: [orderItem(byIndex(9), 1)],
			status: 'shipped',
			daysAgo: 2,
			methodId: 'locker',
		}),
		buildOrder({
			...mine,
			items: [orderItem(byIndex(14), 0, 2)],
			status: 'pending',
			daysAgo: 0,
			methodId: 'express',
		}),
		buildOrder({ ...mine, items: [orderItem(byIndex(20), 3)], status: 'cancelled', daysAgo: 15 }),
	]

	// two months of orders from registered shoppers and one-time guests, a few with promo codes,
	// so the analytics have a previous period to compare with
	const statuses = [
		'delivered',
		'delivered',
		'shipped',
		'paid',
		'delivered',
		'pending',
		'delivered',
		'cancelled',
	]
	const [welcome, freeShipping] = DEMO_PROMO_CODES
	for (let i = 0; i < 64; i++) {
		const status = statuses[i % statuses.length]
		const guest = i % 3 === 2
		const shopper = shoppers[(i * 7) % shoppers.length]
		const [city, postalCode] = CITIES[i % CITIES.length]
		const items = [orderItem(byIndex(i * 3 + 1), i)]
		if (i % 4 === 0) items.push(orderItem(byIndex(i * 5 + 2), i + 1))
		orders.push(
			buildOrder({
				user: guest ? undefined : shopper._id,
				email: guest ? `guest${i + 1}@example.com` : shopper.email,
				address: {
					fullName: guest ? `Guest ${i + 1}` : shopper.username,
					street: `ul. Polna ${i + 3}`,
					postalCode,
					city,
					country: 'Polska',
				},
				items,
				status,
				// open orders are recent; delivered and cancelled ones spread over two months
				daysAgo: ['pending', 'paid', 'shipped'].includes(status) ? i % 9 : 4 + ((i * 11) % 58),
				methodId: ['standard', 'locker', 'express'][i % 3],
				promo: i % 6 === 1 ? welcome : i % 10 === 3 ? freeShipping : undefined,
			}),
		)
	}

	// items often bought together, so the product page shows a "frequently bought together" pair
	const bySlug = (slug) => products.find((product) => product.slug === slug)
	const BUNDLES = [
		['classic-jeans', 'essential-white-tee'],
		['classic-jeans', 'essential-white-tee'],
		['classic-jeans', 'essential-white-tee'],
		['classic-jeans', 'black-leather-jacket'],
		['classic-jeans', 'black-leather-jacket'],
		['classic-jeans', 'trucker-cap'],
		['classic-jeans', 'trucker-cap'],
	]
	BUNDLES.forEach((slugs, i) => {
		const shopper = shoppers[(i * 3 + 1) % shoppers.length]
		const bundle = slugs.map(bySlug)
		if (bundle.some((product) => !product)) return
		orders.push(
			buildOrder({
				user: shopper._id,
				email: shopper.email,
				address: { ...SECOND_ADDRESS, fullName: shopper.username },
				items: bundle.map((product, n) => orderItem(product, i + n)),
				status: 'delivered',
				daysAgo: 6 + i * 6,
			}),
		)
	})

	// one return waiting for a decision in the admin panel
	const delivered = orders.find((order, i) => i >= 4 && order.status === 'delivered')
	delivered.returnRequest = {
		status: 'requested',
		items: [{ ...delivered.items[0], quantity: 1 }],
		reason: 'too_small',
		comment: 'Lovely, but I need one size up.',
		requestedAt: new Date(delivered.deliveredAt.getTime() + DAY_MS),
	}

	await addShipmentsAndInvoices(orders)
	return Order.insertMany(orders)
}

/**
 * Puts the whole shop back into the demo state: catalog, reviews, settings, promo codes,
 * demo accounts and orders. Accounts that visitors created are removed; the owner stays.
 */
export const resetDemoData = async () => {
	await Promise.all([
		Order.deleteMany({}),
		Cart.deleteMany({}),
		StockAlert.deleteMany({}),
		PromoCode.deleteMany({}),
		ActivityLog.deleteMany({}),
		ShopSettings.deleteMany({}),
		Review.deleteMany({}),
		// invoice numbering starts again with the demo orders
		Counter.deleteMany({ _id: /^invoice\// }),
	])
	clearShopSettingsCache()
	await updateShopSettings({ company: DEMO_COMPANY })
	const keep = [
		...DEMO_REVIEWERS,
		...DEMO_SHOPPERS,
		DEMO_ACCOUNTS.customer.username,
		DEMO_ACCOUNTS.admin.username,
	]
	const { deletedCount: removedAccounts } = await User.deleteMany({
		username: { $nin: keep },
		isOwner: { $ne: true },
	})
	// sessions of the removed visitor accounts (the shared demo accounts stay signed in)
	await Session.deleteMany({ user: { $nin: await User.distinct('_id') } })

	const products = await seedCatalog()
	await seedReviews(products)
	const shoppers = [...(await seedReviewers()), ...(await seedShoppers())]
	const { customer } = await seedDemoAccounts(products)
	const orders = await seedDemoOrders({ products, customer, shoppers })
	await PromoCode.insertMany(DEMO_PROMO_CODES)

	return { products: products.length, orders: orders.length, removedAccounts }
}
