/**
 * Sales analytics for the admin panel (GET /admin/analytics).
 *
 * Definitions used everywhere below:
 * - A period is a range of calendar days in the shop time zone (Europe/Warsaw), both ends included.
 *   Orders belong to the period in which they were placed (`createdAt`).
 * - Sales are orders that were paid: status paid, shipped or delivered.
 * - Revenue = what customers paid for sales (`amount`, incl. shipping) minus refunded returns.
 * - Item revenue (top products, brands, categories) = price × quantity, before order discounts.
 * - Returns = return requests of orders placed in the period (except rejected ones for
 *   product return rates), so the numbers of a recent period still grow while returns arrive.
 *
 * Every aggregation starts with a `createdAt` range match on orders; an index on
 * `{ createdAt: 1 }` (or `{ status: 1, createdAt: 1 }`) keeps them fast on large collections.
 */
import { Cart } from '../models/Cart.js'
import { ORDER_STATUSES, Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { MAX_PERIOD_DAYS } from '../validation/analytics.js'
import { badRequest } from '../utils/HttpError.js'

export const TIME_ZONE = 'Europe/Warsaw'
export const DEFAULT_PERIOD_DAYS = 30
/** Periods longer than this are charted per week instead of per day. */
export const DAILY_BUCKETS_MAX_DAYS = 92
/** A product needs at least this many sold units to appear among the most returned. */
export const MIN_RETURN_SAMPLE = 5
const TOP_LIMIT = 10

const SOLD = ['paid', 'shipped', 'delivered']
const DAY_MS = 24 * 60 * 60 * 1000

const round = (value, digits = 2) => {
	const factor = 10 ** digits
	return Math.round((value + Number.EPSILON) * factor) / factor
}
const money = (value) => round(value ?? 0, 2)
/** Ratio rounded to 4 decimals (0.1234 = 12.34%); 0 when there is nothing to divide by. */
const ratio = (part, whole) => (whole ? round(part / whole, 4) : 0)

// --- calendar days in the shop time zone ---------------------------------------------------

/** "2026-11-21" ± `days` (pure calendar arithmetic, no time zones involved). */
export const addDays = (day, days) =>
	new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/** Number of days from `from` to `to`, both included. */
export const dayCount = (from, to) =>
	Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

/** The calendar day of `date` in `timeZone`, e.g. "2026-11-21". */
export const dayIn = (date, timeZone = TIME_ZONE) =>
	new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)

/** How far `timeZone` is ahead of UTC at the instant `date`, in ms (+1h/+2h for Warsaw). */
const zoneOffset = (date, timeZone) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		})
			.formatToParts(date)
			.map((part) => [part.type, Number(part.value)]),
	)
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	)
	return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** The instant when `day` starts (local midnight) in `timeZone`; handles DST changes. */
export const startOfDay = (day, timeZone = TIME_ZONE) => {
	const utcMidnight = Date.parse(`${day}T00:00:00Z`)
	const guess = utcMidnight - zoneOffset(new Date(utcMidnight), timeZone)
	return new Date(utcMidnight - zoneOffset(new Date(guess), timeZone))
}

/**
 * Fills in and checks the requested period.
 * @returns `{ from, to, days, start, end, previous? }` — `start`/`end` are instants
 *   (end exclusive); `previous` is the period of the same length right before
 */
export const resolvePeriod = ({ from, to, compare = 'previous' } = {}, now = new Date()) => {
	const lastDay = to ?? dayIn(now)
	const firstDay = from ?? addDays(lastDay, -(DEFAULT_PERIOD_DAYS - 1))
	if (firstDay > lastDay) throw badRequest('"from" must not be after "to"')
	const days = dayCount(firstDay, lastDay)
	if (days > MAX_PERIOD_DAYS) throw badRequest(`The period can be at most ${MAX_PERIOD_DAYS} days`)

	const range = (fromDay, toDay) => ({
		from: fromDay,
		to: toDay,
		days,
		start: startOfDay(fromDay),
		end: startOfDay(addDays(toDay, 1)),
	})
	const period = range(firstDay, lastDay)
	if (compare === 'previous') {
		period.previous = range(addDays(firstDay, -days), addDays(firstDay, -1))
	}
	return period
}

// --- aggregation building blocks -----------------------------------------------------------

const inRange = ({ start, end }) => ({ createdAt: { $gte: start, $lt: end } })
const isSold = { $in: ['$status', SOLD] }
const hasReturn = { $ne: [{ $ifNull: ['$returnRequest.status', null] }, null] }
const refundOf = {
	$cond: [
		{ $eq: ['$returnRequest.status', 'refunded'] },
		{ $ifNull: ['$returnRequest.refundAmount', 0] },
		0,
	],
}
const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } })
const sumIf = (condition, value) => ({ $sum: { $cond: [condition, value, 0] } })

/** Order totals of a period: one row with counts and sums. */
const totalsStage = {
	$group: {
		_id: null,
		placed: { $sum: 1 },
		sold: countIf(isSold),
		delivered: countIf({ $eq: ['$status', 'delivered'] }),
		cancelled: countIf({ $eq: ['$status', 'cancelled'] }),
		gross: sumIf(isSold, '$amount'),
		refunds: sumIf(isSold, refundOf),
		units: sumIf(isSold, { $sum: '$items.quantity' }),
		returns: countIf({ $and: [isSold, hasReturn] }),
	},
}

const EMPTY_TOTALS = {
	placed: 0,
	sold: 0,
	delivered: 0,
	cancelled: 0,
	gross: 0,
	refunds: 0,
	units: 0,
	returns: 0,
}

/**
 * Customers (by email, so guests count too) with a sale in the period, and how many of them
 * have more than one sale up to the end of the period.
 */
const customerLoyalty = async ({ start, end }) => {
	const [row] = await Order.aggregate([
		{ $match: { status: { $in: SOLD }, createdAt: { $lt: end } } },
		{
			$group: {
				_id: '$email',
				total: { $sum: 1 },
				inPeriod: countIf({ $gte: ['$createdAt', start] }),
			},
		},
		{ $match: { inPeriod: { $gt: 0 } } },
		{ $group: { _id: null, customers: { $sum: 1 }, returning: countIf({ $gt: ['$total', 1] }) } },
	])
	return { customers: row?.customers ?? 0, returning: row?.returning ?? 0 }
}

/** Everything the KPI cards and the funnel need for one period. */
const periodSummary = async (period) => {
	const [[totals], loyalty, newCustomers, openCarts] = await Promise.all([
		Order.aggregate([{ $match: inRange(period) }, totalsStage]),
		customerLoyalty(period),
		User.countDocuments({ role: 'customer', ...inRange(period) }),
		// carts are deleted when an order is placed, so these are the carts left open
		Cart.countDocuments({ updatedAt: { $gte: period.start, $lt: period.end } }),
	])
	return { ...EMPTY_TOTALS, ...totals, ...loyalty, newCustomers, openCarts }
}

/** KPI values from a period summary. */
const kpiValues = (s) => ({
	revenue: money(s.gross - s.refunds),
	orders: s.sold,
	averageOrderValue: money(s.sold ? s.gross / s.sold : 0),
	unitsSold: s.units,
	newCustomers: s.newCustomers,
	returningCustomerRate: ratio(s.returning, s.customers),
	returnRate: ratio(s.returns, s.sold),
	cancelledRate: ratio(s.cancelled, s.placed),
})

/** How each KPI is shown and compared: rates change in points, the rest in percent. */
export const KPI_KINDS = {
	revenue: 'money',
	orders: 'count',
	averageOrderValue: 'money',
	unitsSold: 'count',
	newCustomers: 'count',
	returningCustomerRate: 'rate',
	returnRate: 'rate',
	cancelledRate: 'rate',
}

/**
 * `{ [name]: { kind, value, previous, change } }` — `change` is relative for money and counts
 * (0.25 = +25%, null when the previous value is 0) and a difference for rates (0.05 = +5 points).
 */
const compareKpis = (current, previous) =>
	Object.fromEntries(
		Object.entries(KPI_KINDS).map(([name, kind]) => {
			const value = current[name]
			const before = previous?.[name]
			let change = null
			if (before !== undefined) {
				if (kind === 'rate') change = round(value - before, 4)
				else if (before) change = round((value - before) / before, 4)
			}
			return [name, { kind, value, previous: before ?? null, change }]
		}),
	)

/**
 * Proxy funnel — the shop has no page-view tracking. Carts = carts of signed-in shoppers left
 * open in the period plus carts that became orders (guest carts live only in the browser).
 */
const funnel = (s) => {
	const steps = [
		{ id: 'carts', label: 'Carts', count: s.openCarts + s.placed },
		{ id: 'placed', label: 'Orders placed', count: s.placed },
		{ id: 'paid', label: 'Orders paid', count: s.sold },
		{ id: 'delivered', label: 'Delivered', count: s.delivered },
	]
	return steps.map((step, i) => ({
		...step,
		fromPrevious: i ? ratio(step.count, steps[i - 1].count) : null,
		fromFirst: ratio(step.count, steps[0].count),
	}))
}

// --- chart series --------------------------------------------------------------------------

/** Revenue, sales and placed orders per local day of `[start, end)`, as a Map by day. */
const dailyTotals = async ({ start, end }) => {
	const rows = await Order.aggregate([
		{ $match: { createdAt: { $gte: start, $lt: end } } },
		{
			$group: {
				_id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIME_ZONE } },
				revenue: sumIf(isSold, { $subtract: ['$amount', refundOf] }),
				orders: countIf(isSold),
				placed: { $sum: 1 },
			},
		},
	])
	return new Map(rows.map((row) => [row._id, row]))
}

/**
 * Buckets of a period: days, or weeks counted from the first day (so the current and the
 * previous period line up bucket by bucket, even when they start on different weekdays).
 */
const bucketsOf = (period, size, byDay) =>
	Array.from({ length: Math.ceil(period.days / size) }, (_, i) => {
		const from = addDays(period.from, i * size)
		const to = i * size + size >= period.days ? period.to : addDays(from, size - 1)
		const bucket = { from, to, revenue: 0, orders: 0, placed: 0 }
		for (let day = from; day <= to; day = addDays(day, 1)) {
			const row = byDay.get(day)
			if (!row) continue
			bucket.revenue += row.revenue
			bucket.orders += row.orders
			bucket.placed += row.placed
		}
		bucket.revenue = money(bucket.revenue)
		return bucket
	})

const series = async (period) => {
	const first = period.previous ?? period
	const byDay = await dailyTotals({ start: first.start, end: period.end })
	const interval = period.days > DAILY_BUCKETS_MAX_DAYS ? 'week' : 'day'
	const size = interval === 'week' ? 7 : 1
	return {
		interval,
		current: bucketsOf(period, size, byDay),
		previous: period.previous ? bucketsOf(period.previous, size, byDay) : null,
	}
}

// --- breakdowns of the current period ------------------------------------------------------

const itemRevenue = { $multiply: ['$items.price', '$items.quantity'] }
const byCount = (field, value) => ({
	$group: { _id: field, orders: { $sum: 1 }, value: { $sum: value } },
})

/** Sold items, returns, delivery and promo breakdowns of one period in a single query. */
const breakdowns = async (period) => {
	const [facets] = await Order.aggregate([
		{ $match: inRange(period) },
		{
			$facet: {
				products: [
					{ $match: { status: { $in: SOLD } } },
					{ $unwind: '$items' },
					{
						$group: {
							_id: '$items.productId',
							title: { $last: '$items.title' },
							brand: { $last: '$items.brand' },
							units: { $sum: '$items.quantity' },
							revenue: { $sum: itemRevenue },
						},
					},
				],
				sizes: [
					{ $match: { status: { $in: SOLD } } },
					{ $unwind: '$items' },
					{ $group: { _id: '$items.size', units: { $sum: '$items.quantity' } } },
					{ $sort: { units: -1, _id: 1 } },
				],
				delivery: [
					{ $match: { status: { $in: SOLD } } },
					byCount({ $ifNull: ['$shippingMethod.label', 'Unknown'] }, '$shipping'),
					{ $sort: { orders: -1, _id: 1 } },
				],
				promoCodes: [
					{ $match: { status: { $in: SOLD }, promoCode: { $type: 'string' } } },
					byCount('$promoCode', '$discount'),
					{ $sort: { orders: -1, value: -1 } },
				],
				statuses: [{ $group: { _id: '$status', orders: { $sum: 1 } } }],
				returnReasons: [
					{ $match: { status: { $in: SOLD }, returnRequest: { $exists: true } } },
					{ $group: { _id: '$returnRequest.reason', count: { $sum: 1 } } },
					{ $sort: { count: -1, _id: 1 } },
				],
				returnStatuses: [
					{ $match: { status: { $in: SOLD }, returnRequest: { $exists: true } } },
					{ $group: { _id: '$returnRequest.status', count: { $sum: 1 } } },
				],
				returnedItems: [
					{
						$match: {
							status: { $in: SOLD },
							'returnRequest.status': { $in: ['requested', 'approved', 'refunded'] },
						},
					},
					{ $unwind: '$returnRequest.items' },
					{
						$group: {
							_id: '$returnRequest.items.productId',
							units: { $sum: '$returnRequest.items.quantity' },
						},
					},
				],
			},
		},
	])
	return facets
}

/** Adds each row's share of the total of `key`, sorted by `key` and cut to the top. */
const topBy = (rows, key, total) =>
	rows
		.toSorted((a, b) => b[key] - a[key] || b.revenue - a.revenue || a.title?.localeCompare(b.title))
		.slice(0, TOP_LIMIT)
		.map((row) => ({ ...row, share: ratio(row[key], total) }))

/** Sums product rows into groups, e.g. per brand; a product may be in several categories. */
const groupRows = (rows, keysOf, totals) => {
	const groups = new Map()
	for (const row of rows) {
		for (const name of keysOf(row)) {
			const group = groups.get(name) ?? { name, units: 0, revenue: 0 }
			group.units += row.units
			group.revenue += row.revenue
			groups.set(name, group)
		}
	}
	return [...groups.values()]
		.map((group) => ({
			...group,
			revenue: money(group.revenue),
			share: ratio(group.revenue, totals.revenue),
		}))
		.toSorted((a, b) => b.revenue - a.revenue || b.units - a.units || a.name.localeCompare(b.name))
		.slice(0, TOP_LIMIT)
}

const productsSection = async (facets) => {
	const rows = facets.products.map(({ _id, ...row }) => ({
		productId: String(_id),
		...row,
		revenue: money(row.revenue),
	}))
	const totals = {
		units: rows.reduce((sum, row) => sum + row.units, 0),
		revenue: money(rows.reduce((sum, row) => sum + row.revenue, 0)),
	}
	const categories = new Map(
		(
			await Product.find(
				{ _id: { $in: facets.products.map((row) => row._id) } },
				'categories',
			).lean()
		).map((product) => [String(product._id), product.categories ?? []]),
	)
	const totalUnits = facets.sizes.reduce((sum, row) => sum + row.units, 0)

	return {
		totals,
		byRevenue: topBy(rows, 'revenue', totals.revenue),
		byUnits: topBy(rows, 'units', totals.units),
		brands: groupRows(rows, (row) => [row.brand], totals),
		// products deleted since then have no categories any more
		categories: groupRows(
			rows,
			(row) => {
				const names = categories.get(row.productId)
				return names?.length ? names : ['uncategorized']
			},
			totals,
		),
		sizes: facets.sizes.map((row) => ({
			size: row._id,
			units: row.units,
			share: ratio(row.units, totalUnits),
		})),
	}
}

const returnsSection = (facets, summary) => {
	const sold = new Map(facets.products.map((row) => [String(row._id), row]))
	const byStatus = Object.fromEntries(facets.returnStatuses.map((row) => [row._id, row.count]))
	return {
		count: summary.returns,
		rate: ratio(summary.returns, summary.sold),
		refunded: money(summary.refunds),
		byStatus,
		reasons: facets.returnReasons.map((row) => ({
			reason: row._id,
			count: row.count,
			share: ratio(row.count, summary.returns),
		})),
		minSample: MIN_RETURN_SAMPLE,
		products: facets.returnedItems
			.map((row) => {
				const product = sold.get(String(row._id))
				if (!product || product.units < MIN_RETURN_SAMPLE) return null
				return {
					productId: String(row._id),
					title: product.title,
					brand: product.brand,
					sold: product.units,
					returned: row.units,
					rate: ratio(row.units, product.units),
				}
			})
			.filter(Boolean)
			.toSorted((a, b) => b.rate - a.rate || b.returned - a.returned)
			.slice(0, TOP_LIMIT),
	}
}

const shareRows = (rows, total, extra) =>
	rows.map((row) => ({
		name: row._id,
		orders: row.orders,
		share: ratio(row.orders, total),
		...extra(row),
	}))

/**
 * The whole analytics report for `query` (`{ from?, to?, compare? }`).
 * @param now for tests: "today" in the shop time zone
 */
export const getAnalytics = async (query, now = new Date()) => {
	const period = resolvePeriod(query, now)
	const [current, previous, chart, facets] = await Promise.all([
		periodSummary(period),
		period.previous ? periodSummary(period.previous) : null,
		series(period),
		breakdowns(period),
	])
	const promoOrders = facets.promoCodes.reduce((sum, row) => sum + row.orders, 0)

	return {
		period: {
			from: period.from,
			to: period.to,
			days: period.days,
			timeZone: TIME_ZONE,
			previous: period.previous ? { from: period.previous.from, to: period.previous.to } : null,
		},
		kpis: compareKpis(kpiValues(current), previous && kpiValues(previous)),
		funnel: funnel(current),
		series: chart,
		products: await productsSection(facets),
		returns: returnsSection(facets, current),
		delivery: shareRows(facets.delivery, current.sold, (row) => ({ shipping: money(row.value) })),
		promoCodes: {
			orders: promoOrders,
			share: ratio(promoOrders, current.sold),
			discount: money(facets.promoCodes.reduce((sum, row) => sum + row.value, 0)),
			codes: shareRows(facets.promoCodes.slice(0, TOP_LIMIT), current.sold, (row) => ({
				discount: money(row.value),
			})),
		},
		// every status in lifecycle order, also those without orders
		statuses: ORDER_STATUSES.map((status) => {
			const orders = facets.statuses.find((row) => row._id === status)?.orders ?? 0
			return { name: status, orders, share: ratio(orders, current.placed) }
		}),
	}
}
