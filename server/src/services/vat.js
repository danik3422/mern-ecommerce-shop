/**
 * VAT arithmetic for invoices. Shop prices are gross (VAT included), so net and VAT are
 * derived from the gross amounts. Everything is computed in whole grosze (1/100 PLN) to avoid
 * floating-point errors, and VAT is calculated per invoice line: the totals are the sums of
 * the lines, so net + VAT = gross holds for every line and for the whole invoice.
 */

/** The standard Polish VAT rate (%) — clothing and delivery are both taxed at 23%. */
export const VAT_RATE = 23

export const toGrosze = (amount) => Math.round(amount * 100)
export const fromGrosze = (grosze) => grosze / 100

/** Splits a gross amount in grosze into `{ net, vat, gross }` (grosze), net rounded half up. */
export const splitGross = (gross, rate = VAT_RATE) => {
	const net = Math.round((gross * 100) / (100 + rate))
	return { net, vat: gross - net, gross }
}

/**
 * Divides `total` grosze between `amounts` in proportion to them (largest remainder method),
 * e.g. an order discount spread over its lines. The parts are whole grosze and add up to `total`.
 */
export const allocate = (amounts, total) => {
	const sum = amounts.reduce((a, b) => a + b, 0)
	if (sum === 0 || total === 0) return amounts.map(() => 0)
	const exact = amounts.map((amount) => (total * amount) / sum)
	const parts = exact.map(Math.floor)
	let left = total - parts.reduce((a, b) => a + b, 0)
	const byRemainder = exact
		.map((value, index) => ({ index, remainder: value - Math.floor(value) }))
		.sort((a, b) => b.remainder - a.remainder || a.index - b.index)
	for (const { index } of byRemainder) {
		if (left === 0) break
		parts[index]++
		left--
	}
	return parts
}

/**
 * Totals of invoice lines `[{ net, vat, gross }]` (grosze), grouped by rate for the
 * VAT summary table: `{ net, vat, gross, byRate: [{ rate, net, vat, gross }] }`.
 */
export const sumLines = (lines) => {
	const byRate = new Map()
	for (const line of lines) {
		const rate = line.vatRate ?? VAT_RATE
		const row = byRate.get(rate) ?? { rate, net: 0, vat: 0, gross: 0 }
		row.net += line.net
		row.vat += line.vat
		row.gross += line.gross
		byRate.set(rate, row)
	}
	const rows = [...byRate.values()]
	return {
		net: rows.reduce((sum, row) => sum + row.net, 0),
		vat: rows.reduce((sum, row) => sum + row.vat, 0),
		gross: rows.reduce((sum, row) => sum + row.gross, 0),
		byRate: rows,
	}
}
