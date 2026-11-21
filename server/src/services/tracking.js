import { CARRIERS } from '../models/Order.js'

/**
 * Parcel tracking and delivery estimates (pure functions, easy to test).
 */

export { CARRIERS }

/** Public tracking pages of the carriers; "other" has none (the admin pastes a link). */
const TRACKING_PAGES = {
	inpost: (number) => `https://inpost.pl/sledzenie-przesylek?number=${number}`,
	dpd: (number) => `https://tracktrace.dpd.com.pl/parcelDetails?typ=1&p1=${number}`,
	dhl: (number) =>
		`https://www.dhl.com/pl-pl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${number}`,
	poczta: (number) => `https://emonitoring.poczta-polska.pl/?numer=${number}`,
	gls: (number) => `https://gls-group.com/PL/pl/sledzenie-paczek?match=${number}`,
}

/** The carrier's tracking page for a parcel, or undefined for "other" carriers. */
export const trackingUrl = (carrier, number) => {
	const page = TRACKING_PAGES[carrier]
	return page && number ? page(encodeURIComponent(number.replace(/\s/g, ''))) : undefined
}

/**
 * Tracking as stored on the order. An empty `url` is generated from the carrier and number,
 * so admins only type a link for unknown carriers or when the generated one is wrong.
 * @param tracking `{ carrier, number, url? }` (validated by validation/order.js)
 */
export const toTracking = ({ carrier, number, url }, now = new Date()) => {
	const link = url || trackingUrl(carrier, number)
	return { carrier, number, ...(link && { url: link }), updatedAt: now }
}

const DAY_MS = 24 * 60 * 60 * 1000

const isWeekend = (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6

/** The date `days` working days (Monday–Friday) after `date`, at midnight UTC. */
export const addWorkingDays = (date, days) => {
	let day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
	let left = days
	// a parcel handed over at the weekend starts travelling on Monday
	while (isWeekend(day)) day = new Date(day.getTime() + DAY_MS)
	while (left > 0) {
		day = new Date(day.getTime() + DAY_MS)
		if (!isWeekend(day)) left--
	}
	return day
}

/** Working days the shop needs to hand a paid order to the carrier. */
const DISPATCH_DAYS = 1

/**
 * When a paid or shipped order should arrive: the delivery method's working days
 * (shop settings) counted from shipping — or from payment plus a day for packing,
 * while the order is not shipped yet. Weekends are skipped.
 * @returns `{ from, to }` as YYYY-MM-DD, or null (not paid yet, delivered or cancelled)
 */
export const estimateDelivery = (order, settings) => {
	const shipped = order.status === 'shipped' && order.shippedAt
	const paid = order.status === 'paid' && order.payment?.paidAt
	if (!shipped && !paid) return null

	const method = settings.shippingMethods.find((m) => m.id === order.shippingMethod?.id)
	const [min, max] = method?.days ?? [2, 5]
	const start = new Date(shipped ? order.shippedAt : order.payment.paidAt)
	const extra = shipped ? 0 : DISPATCH_DAYS
	const day = (n) =>
		addWorkingDays(start, n + extra)
			.toISOString()
			.slice(0, 10)
	return { from: day(min), to: day(max) }
}
