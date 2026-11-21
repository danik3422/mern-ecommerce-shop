/** Number and date helpers shared by the admin charts (English, amounts in PLN). */

const countFormatter = new Intl.NumberFormat('en-GB')
const compactMoneyFormatter = new Intl.NumberFormat('en-GB', {
	style: 'currency',
	currency: 'PLN',
	notation: 'compact',
	maximumFractionDigits: 1,
})
const dayMonth = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	timeZone: 'UTC',
})
const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
})

export const formatCount = (value) => countFormatter.format(value)

/** Short amounts for axis labels, e.g. "PLN 1.2K". */
export const formatCompactMoney = (value) => compactMoneyFormatter.format(value)

/** 0.1234 → "12.3%" */
export const formatPercent = (ratio, digits = 1) =>
	`${(ratio * 100).toFixed(digits).replace(/\.0+$/, '')}%`

/** Calendar days ("YYYY-MM-DD") are formatted in UTC, so they never shift by a time zone. */
const asDate = (day) => new Date(`${day}T00:00:00Z`)

/** "3 Mar" or, with `year`, "3 Mar 2026" */
export const formatDay = (day, { year = false } = {}) =>
	(year ? dayMonthYear : dayMonth).format(asDate(day))

/** "3 Mar", "3–9 Mar 2026", "28 Feb – 6 Mar 2026" */
export const formatDayRange = (from, to, { year = false } = {}) => {
	if (from === to) return formatDay(from, { year })
	const sameMonth = from.slice(0, 7) === to.slice(0, 7)
	const sameYear = from.slice(0, 4) === to.slice(0, 4)
	if (sameMonth) return `${asDate(from).getUTCDate()}–${formatDay(to, { year })}`
	return `${formatDay(from, { year: year && !sameYear })} – ${formatDay(to, { year })}`
}

/**
 * A "nice" axis maximum and evenly spaced ticks from 0, e.g. 873 → { max: 1000, ticks: [0, 250, …] }.
 * @param count number of intervals
 * @param integer whole-number steps only (for counts)
 */
export const niceScale = (value, count = 4, { integer = false } = {}) => {
	if (!(value > 0)) return { max: count, ticks: Array.from({ length: count + 1 }, (_, i) => i) }
	const rough = value / count
	const magnitude = 10 ** Math.floor(Math.log10(rough))
	const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)
	const step = integer ? Math.max(1, Math.ceil(nice)) : nice
	const max = step * Math.ceil(value / step)
	return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) }
}
