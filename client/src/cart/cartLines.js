/**
 * Pure helpers for cart lines: `{ productId, quantity, color?, size? }`.
 * The same product in another color/size is a separate line.
 */

export const MAX_QUANTITY = 99

export const lineKey = ({ productId, color = '', size = '' }) => `${productId}|${color}|${size}`

const clampQuantity = (quantity) => Math.min(Math.max(quantity, 0), MAX_QUANTITY)

export const addLine = (lines, line) => {
	const key = lineKey(line)
	const existing = lines.find((l) => lineKey(l) === key)
	if (!existing) return [...lines, { ...line, quantity: clampQuantity(line.quantity) }]

	return lines.map((l) =>
		l === existing ? { ...l, quantity: clampQuantity(l.quantity + line.quantity) } : l,
	)
}

/** Sets the quantity of a line; zero or less removes it. */
export const setLineQuantity = (lines, key, quantity) =>
	quantity <= 0
		? lines.filter((l) => lineKey(l) !== key)
		: lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQuantity(quantity) } : l))

export const removeProducts = (lines, productIds) => {
	const ids = new Set(productIds)
	return lines.filter((l) => !ids.has(l.productId))
}

/**
 * Combines the saved (server) cart with the local one after sign-in.
 * For the same line the bigger quantity wins, so reloading the page never doubles quantities.
 */
export const mergeLines = (saved, local) => {
	const merged = new Map(saved.map((l) => [lineKey(l), l]))
	for (const line of local) {
		const existing = merged.get(lineKey(line))
		if (!existing || line.quantity > existing.quantity) merged.set(lineKey(line), line)
	}
	return [...merged.values()]
}

export const countItems = (lines) => lines.reduce((sum, l) => sum + l.quantity, 0)

/** Only the fields the API accepts. */
export const toApiItems = (lines) =>
	lines.map(({ productId, quantity, color, size }) => ({ productId, quantity, color, size }))
