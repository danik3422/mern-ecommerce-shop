/**
 * Report periods of the analytics page, kept in the URL as `?period=30d` or
 * `?period=custom&from=2026-03-01&to=2026-03-31`. Days are calendar days in the shop time zone.
 */
export const SHOP_TIME_ZONE = 'Europe/Warsaw'
export const DEFAULT_PERIOD = '30d'
/** Same limit as the API (server/src/validation/analytics.js). */
export const MAX_PERIOD_DAYS = 366

export const PERIOD_PRESETS = [
	{ id: '7d', label: '7 days' },
	{ id: '30d', label: '30 days' },
	{ id: '90d', label: '90 days' },
	{ id: 'month', label: 'This month' },
	{ id: 'last-month', label: 'Last month' },
	{ id: 'custom', label: 'Custom' },
]

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Today in the shop time zone as "YYYY-MM-DD". */
export const shopToday = (now = new Date()) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE }).format(now)

export const addDays = (day, days) =>
	new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

export const dayCount = (from, to) =>
	Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

const isDay = (value) => DAY_PATTERN.test(value ?? '') && !Number.isNaN(Date.parse(value))

/** Checks a custom range; returns an error message or null. */
export const rangeError = (from, to) => {
	if (!isDay(from) || !isDay(to)) return 'Choose both dates'
	if (from > to) return 'The start must be before the end'
	if (dayCount(from, to) > MAX_PERIOD_DAYS) return `At most ${MAX_PERIOD_DAYS} days`
	return null
}

/**
 * The days of a period preset; an invalid custom range falls back to the default.
 * @returns `{ period, from, to }`
 */
export const resolvePeriod = ({ period, from, to }, today = shopToday()) => {
	const lastDays = (days) => ({ from: addDays(today, -(days - 1)), to: today })
	const monthStart = `${today.slice(0, 8)}01`
	switch (period) {
		case '7d':
			return { period, ...lastDays(7) }
		case '90d':
			return { period, ...lastDays(90) }
		case 'month':
			return { period, from: monthStart, to: today }
		case 'last-month': {
			const end = addDays(monthStart, -1)
			return { period, from: `${end.slice(0, 8)}01`, to: end }
		}
		case 'custom':
			if (!rangeError(from, to)) return { period, from, to }
	}
	return { period: DEFAULT_PERIOD, ...lastDays(30) }
}
