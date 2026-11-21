/**
 * The public demo: shared demo accounts with realistic data, and the nightly reset that
 * puts the whole shop back into this state (see services/demoReset.js).
 */
import { randomBytes } from 'node:crypto'
import { SHOP_DEFAULTS } from '../config/shop.js'
import { ActivityLog } from '../models/ActivityLog.js'
import { Cart } from '../models/Cart.js'
import { Order } from '../models/Order.js'
import { PromoCode } from '../models/PromoCode.js'
import { Review } from '../models/Review.js'
import { ShopSettings } from '../models/ShopSettings.js'
import { StockAlert } from '../models/StockAlert.js'
import { User } from '../models/User.js'
import { hashPassword } from '../services/password.js'
import { clearShopSettingsCache } from '../services/shopSettings.js'
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
		permissions: ['dashboard', 'products', 'orders', 'returns', 'reviews'],
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

/**
 * An order as checkout would have saved it, `daysAgo` days in the past,
 * with the dates and status history of everything that happened since.
 */
const buildOrder = ({ user, email, address, items, status, daysAgo, methodId = 'standard' }) => {
	const method = SHOP_DEFAULTS.shippingMethods.find((m) => m.id === methodId)
	const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
	const free = method.freeShipping && subtotal >= SHOP_DEFAULTS.freeShippingFrom
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
		shipping,
		shippingMethod: { id: method.id, label: method.label.en, price: method.price },
		amount: roundMoney(subtotal + shipping),
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
export const seedDemoOrders = async ({ products, customer, reviewers }) => {
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

	const statuses = [
		'delivered',
		'delivered',
		'shipped',
		'paid',
		'delivered',
		'pending',
		'paid',
		'cancelled',
	]
	for (let i = 0; i < 26; i++) {
		const reviewer = reviewers[i % reviewers.length]
		const [city, postalCode] = CITIES[i % CITIES.length]
		const items = [orderItem(byIndex(i * 3 + 1), i)]
		if (i % 3 === 0) items.push(orderItem(byIndex(i * 5 + 2), i + 1))
		const status = statuses[i % statuses.length]
		orders.push(
			buildOrder({
				user: reviewer._id,
				email: reviewer.email,
				address: {
					fullName: reviewer.username,
					street: `ul. Polna ${i + 3}`,
					postalCode,
					city,
					country: 'Polska',
				},
				items,
				status,
				// spread over a month, at least a few days old once delivered
				daysAgo: status === 'delivered' ? 5 + ((i * 7) % 25) : (i * 5) % 12,
				methodId: ['standard', 'locker', 'express'][i % 3],
			}),
		)
	}

	// one return waiting for a decision in the admin panel
	const delivered = orders.find((order, i) => i >= 4 && order.status === 'delivered')
	delivered.returnRequest = {
		status: 'requested',
		items: [{ ...delivered.items[0], quantity: 1 }],
		reason: 'too_small',
		comment: 'Lovely, but I need one size up.',
		requestedAt: new Date(delivered.deliveredAt.getTime() + DAY_MS),
	}

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
	])
	clearShopSettingsCache()
	const keep = [...DEMO_REVIEWERS, DEMO_ACCOUNTS.customer.username, DEMO_ACCOUNTS.admin.username]
	const { deletedCount: removedAccounts } = await User.deleteMany({
		username: { $nin: keep },
		isOwner: { $ne: true },
	})

	const products = await seedCatalog()
	await seedReviews(products)
	const reviewers = await seedReviewers()
	const { customer } = await seedDemoAccounts(products)
	const orders = await seedDemoOrders({ products, customer, reviewers })
	await PromoCode.insertMany(DEMO_PROMO_CODES)

	return { products: products.length, orders: orders.length, removedAccounts }
}
