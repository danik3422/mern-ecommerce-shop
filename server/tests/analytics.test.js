import { beforeEach, describe, expect, it } from 'vitest'
import { Cart } from '../src/models/Cart.js'
import { Order } from '../src/models/Order.js'
import { User } from '../src/models/User.js'
import { dayIn, resolvePeriod, startOfDay } from '../src/services/analytics.js'
import { api, createProduct, createUser, validAddress } from './helpers.js'

const URL = '/api/admin/analytics'
// 1–10 March 2026; the previous period is 19–28 February (Warsaw is UTC+1 then)
const PERIOD = { from: '2026-03-01', to: '2026-03-10' }

const COURIER = { id: 'courier', label: 'Courier', price: 15 }
const LOCKER = { id: 'locker', label: 'Parcel locker', price: 0 }

let owner
let jeans
let tee

/** An order placed at `createdAt` (ISO), with items `[product, quantity, price, size]`. */
const order = (createdAt, lines, { shipping = 0, discount = 0, ...overrides } = {}) => {
	const items = lines.map(([product, quantity, price, size]) => ({
		productId: product._id,
		title: product.title,
		brand: product.brand,
		image: '/images/products/product.jpg',
		price,
		quantity,
		size,
		color: 'black',
	}))
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
	return {
		email: 'someone@example.com',
		items,
		subtotal,
		discount,
		shipping,
		amount: subtotal - discount + shipping,
		address: validAddress,
		status: 'paid',
		createdAt: new Date(createdAt),
		...overrides,
	}
}

/** Inserts raw documents so `createdAt`/`updatedAt` keep the crafted dates. */
const insert = (model, docs) => model.collection.insertMany(docs)

beforeEach(async () => {
	owner = await createUser({ username: 'owner', isAdmin: true })
	jeans = await createProduct({ title: 'Jeans', brand: 'Acme', categories: ['women', 'jeans'] })
	tee = await createProduct({ title: 'Tee', brand: 'Basic', categories: ['men'] })
})

/** A crafted month: sales, a refunded return, a promo code, a cancellation and a pending order. */
const seedOrders = async () => {
	await insert(Order, [
		// current period
		order('2026-03-02T10:00:00Z', [[jeans, 4, 50, 'M']], {
			email: 'a@example.com',
			status: 'delivered',
			shipping: 15,
			shippingMethod: COURIER,
			returnRequest: {
				status: 'refunded',
				reason: 'too_small',
				items: [{ productId: jeans._id, size: 'M', quantity: 1, title: 'Jeans', price: 50 }],
				refundAmount: 50,
				requestedAt: new Date('2026-03-08T10:00:00Z'),
			},
		}),
		order('2026-03-03T10:00:00Z', [[tee, 1, 50, 'S']], {
			email: 'b@example.com',
			discount: 5,
			promoCode: 'SAVE10',
			shippingMethod: LOCKER,
		}),
		// 00:30 on 5 March in Warsaw
		order('2026-03-04T23:30:00Z', [[jeans, 1, 100, 'M']], {
			email: 'a@example.com',
			status: 'shipped',
			shipping: 15,
			shippingMethod: COURIER,
		}),
		order('2026-03-06T10:00:00Z', [[tee, 3, 50, 'S']], {
			email: 'c@example.com',
			status: 'cancelled',
		}),
		order('2026-03-07T10:00:00Z', [[tee, 1, 50, 'S']], {
			email: 'd@example.com',
			status: 'pending',
		}),
		// 00:30 on 1 March in Warsaw — still 28 February in UTC
		order('2026-02-28T23:30:00Z', [[tee, 1, 50, 'S']], {
			email: 'e@example.com',
			shippingMethod: LOCKER,
		}),
		// previous period
		order('2026-02-20T10:00:00Z', [[jeans, 1, 100, 'M']], {
			email: 'b@example.com',
			status: 'delivered',
		}),
		order('2026-02-25T10:00:00Z', [[tee, 2, 50, 'S']], { email: 'f@example.com' }),
		// outside both periods
		order('2026-03-11T10:00:00Z', [[tee, 1, 999, 'S']], { email: 'g@example.com' }),
	])
	const customer = (username, createdAt) => ({
		username,
		email: `${username}@example.com`,
		passwordHash: 'x',
		role: 'customer',
		createdAt: new Date(createdAt),
	})
	await insert(User, [
		customer('new1', '2026-03-02T09:00:00Z'),
		customer('new2', '2026-03-09T09:00:00Z'),
		customer('old1', '2026-02-21T09:00:00Z'),
	])
	await insert(Cart, [
		{ user: owner.user._id, items: [], updatedAt: new Date('2026-03-03T12:00Z') },
	])
}

const getReport = (query = PERIOD) => api().get(URL).query(query).set(owner.auth).expect(200)

describe('GET /api/admin/analytics — access', () => {
	it('needs the analytics permission', async () => {
		await api().get(URL).expect(401)
		const shopper = await createUser({ username: 'shopper' })
		await api().get(URL).set(shopper.auth).expect(403)
		const support = await createUser({ username: 'support', permissions: ['orders'] })
		const denied = await api().get(URL).set(support.auth).expect(403)
		expect(denied.body.message).toMatch(/analytics/)

		const analyst = await createUser({ username: 'analyst', permissions: ['analytics'] })
		await api().get(URL).set(analyst.auth).expect(200)
	})

	it('rejects invalid periods', async () => {
		await api().get(URL).query({ from: '2026-03-10', to: '2026-03-01' }).set(owner.auth).expect(400)
		await api().get(URL).query({ from: '2026-13-01' }).set(owner.auth).expect(400)
		await api().get(URL).query({ from: '2025-01-01', to: '2026-03-01' }).set(owner.auth).expect(400)
		await api().get(URL).query({ compare: 'year' }).set(owner.auth).expect(400)
	})
})

describe('GET /api/admin/analytics — report', () => {
	it('defaults to the last 30 days and handles an empty shop', async () => {
		const { body } = await getReport({})
		expect(body.period).toMatchObject({
			days: 30,
			to: dayIn(new Date()),
			timeZone: 'Europe/Warsaw',
		})
		expect(body.kpis.revenue).toEqual({ kind: 'money', value: 0, previous: 0, change: null })
		expect(body.kpis.returnRate).toMatchObject({ kind: 'rate', value: 0, change: 0 })
		expect(body.series.current).toHaveLength(30)
		expect(body.products.byRevenue).toEqual([])
		expect(body.funnel.map((step) => step.count)).toEqual([0, 0, 0, 0])
	})

	it('calculates KPIs with refunds and cancellations and compares them', async () => {
		await seedOrders()
		const { body } = await getReport()

		expect(body.period.previous).toEqual({ from: '2026-02-19', to: '2026-02-28' })
		const values = Object.fromEntries(Object.entries(body.kpis).map(([k, v]) => [k, v.value]))
		expect(values).toEqual({
			// 215 + 45 + 115 + 50 paid, minus the 50 refund
			revenue: 375,
			orders: 4,
			averageOrderValue: 106.25,
			unitsSold: 7,
			newCustomers: 2,
			// a@ has two sales, b@ bought before; e@ is new
			returningCustomerRate: 0.6667,
			returnRate: 0.25,
			cancelledRate: 0.1667,
		})
		expect(body.kpis.revenue).toMatchObject({ previous: 200, change: 0.875 })
		expect(body.kpis.orders).toMatchObject({ previous: 2, change: 1 })
		expect(body.kpis.averageOrderValue).toMatchObject({ previous: 100, change: 0.0625 })
		expect(body.kpis.newCustomers).toMatchObject({ previous: 1, change: 1 })
		// rates change in points
		expect(body.kpis.returnRate).toMatchObject({ previous: 0, change: 0.25 })
		expect(body.kpis.returningCustomerRate).toMatchObject({ previous: 0, change: 0.6667 })
	})

	it('builds the proxy funnel', async () => {
		await seedOrders()
		const { body } = await getReport()
		expect(body.funnel).toEqual([
			{ id: 'carts', label: 'Carts', count: 7, fromPrevious: null, fromFirst: 1 },
			{ id: 'placed', label: 'Orders placed', count: 6, fromPrevious: 0.8571, fromFirst: 0.8571 },
			{ id: 'paid', label: 'Orders paid', count: 4, fromPrevious: 0.6667, fromFirst: 0.5714 },
			{ id: 'delivered', label: 'Delivered', count: 1, fromPrevious: 0.25, fromFirst: 0.1429 },
		])
	})

	it('buckets days in the Warsaw time zone, with the previous period alongside', async () => {
		await seedOrders()
		const { body } = await getReport()
		const { interval, current, previous } = body.series
		expect(interval).toBe('day')
		expect(current).toHaveLength(10)
		expect(current[0]).toEqual({
			from: '2026-03-01',
			to: '2026-03-01',
			revenue: 50,
			orders: 1,
			placed: 1,
		})
		expect(current[1]).toMatchObject({ from: '2026-03-02', revenue: 165, orders: 1 })
		expect(current[3]).toMatchObject({ from: '2026-03-04', revenue: 0, placed: 0 })
		expect(current[4]).toMatchObject({ from: '2026-03-05', revenue: 115, orders: 1 })
		expect(current[5]).toMatchObject({ from: '2026-03-06', revenue: 0, orders: 0, placed: 1 })
		expect(previous).toHaveLength(10)
		expect(previous[1]).toMatchObject({ from: '2026-02-20', revenue: 100 })
		expect(previous[9]).toMatchObject({ from: '2026-02-28', revenue: 0 })
	})

	it('groups long periods by week and can skip the comparison', async () => {
		await seedOrders()
		const { body } = await getReport({ from: '2026-01-01', to: '2026-06-30', compare: 'none' })
		expect(body.series.interval).toBe('week')
		expect(body.series.previous).toBeNull()
		expect(body.kpis.revenue.change).toBeNull()
		const weeks = body.series.current
		expect(weeks).toHaveLength(26)
		expect(weeks[0]).toMatchObject({ from: '2026-01-01', to: '2026-01-07' })
		expect(weeks.at(-1)).toMatchObject({ from: '2026-06-25', to: '2026-06-30' })
		// the weeks add up to the KPI
		const total = weeks.reduce((sum, week) => sum + week.revenue, 0)
		expect(total).toBeCloseTo(body.kpis.revenue.value)
	})

	it('ranks products, brands, categories and sizes', async () => {
		await seedOrders()
		const { products } = (await getReport()).body
		expect(products.totals).toEqual({ units: 7, revenue: 400 })
		expect(products.byRevenue).toEqual([
			{
				productId: String(jeans._id),
				title: 'Jeans',
				brand: 'Acme',
				units: 5,
				revenue: 300,
				share: 0.75,
			},
			{
				productId: String(tee._id),
				title: 'Tee',
				brand: 'Basic',
				units: 2,
				revenue: 100,
				share: 0.25,
			},
		])
		expect(products.byUnits[0]).toMatchObject({ title: 'Jeans', share: 0.7143 })
		expect(products.brands.map((b) => [b.name, b.revenue])).toEqual([
			['Acme', 300],
			['Basic', 100],
		])
		expect(products.categories.map((c) => [c.name, c.revenue])).toEqual([
			['jeans', 300],
			['women', 300],
			['men', 100],
		])
		expect(products.sizes).toEqual([
			{ size: 'M', units: 5, share: 0.7143 },
			{ size: 'S', units: 2, share: 0.2857 },
		])
	})

	it('summarises returns, delivery, promo codes and statuses', async () => {
		await seedOrders()
		const { body } = await getReport()
		expect(body.returns).toMatchObject({
			count: 1,
			rate: 0.25,
			refunded: 50,
			byStatus: { refunded: 1 },
			reasons: [{ reason: 'too_small', count: 1, share: 1 }],
			minSample: 5,
			products: [{ title: 'Jeans', sold: 5, returned: 1, rate: 0.2 }],
		})
		expect(body.delivery).toEqual([
			{ name: 'Courier', orders: 2, share: 0.5, shipping: 30 },
			{ name: 'Parcel locker', orders: 2, share: 0.5, shipping: 0 },
		])
		expect(body.promoCodes).toEqual({
			orders: 1,
			share: 0.25,
			discount: 5,
			codes: [{ name: 'SAVE10', orders: 1, share: 0.25, discount: 5 }],
		})
		expect(body.statuses.map((s) => [s.name, s.orders])).toEqual([
			['pending', 1],
			['paid', 2],
			['shipped', 1],
			['delivered', 1],
			['cancelled', 1],
		])
	})
})

describe('analytics periods', () => {
	it('starts days at midnight in Warsaw, also around DST changes', () => {
		expect(startOfDay('2026-03-01').toISOString()).toBe('2026-02-28T23:00:00.000Z')
		expect(startOfDay('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z')
		expect(startOfDay('2026-03-30').toISOString()).toBe('2026-03-29T22:00:00.000Z')
		expect(startOfDay('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z')
		expect(startOfDay('2026-10-26').toISOString()).toBe('2026-10-25T23:00:00.000Z')
	})

	it('fills in defaults and the previous period', () => {
		const now = new Date('2026-11-20T23:30:00Z') // already 21 November in Warsaw
		expect(resolvePeriod({}, now)).toMatchObject({
			from: '2026-10-23',
			to: '2026-11-21',
			days: 30,
			previous: { from: '2026-09-23', to: '2026-10-22', days: 30 },
		})
		expect(resolvePeriod({ from: '2026-11-01', compare: 'none' }, now)).toMatchObject({
			from: '2026-11-01',
			to: '2026-11-21',
			days: 21,
		})
		expect(resolvePeriod({ from: '2026-11-01' }, now).previous).toBeDefined()
		expect(() => resolvePeriod({ from: '2025-01-01', to: '2026-01-02' }, now)).toThrow(/366/)
	})
})
