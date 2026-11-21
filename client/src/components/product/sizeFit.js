/** Fit answers needed before the product page shows a fit summary (same as the server). */
export const MIN_FIT_ANSWERS = 3

/** Fit verdicts from reviews that suggest another size. */
const SIZE_STEP = { small: 1, large: -1 }

/**
 * The size reviewers would suggest instead of the chosen one: one size up when the product
 * runs small, one down when it runs large. Null when the fit is fine, there is no such size
 * or it is sold out.
 * @param sizes sizes of the variant in their usual order (`[{ label, stock }]`)
 */
export const suggestedSize = (sizes, chosen, verdict) => {
	const step = SIZE_STEP[verdict]
	const index = sizes.findIndex((size) => size.label === chosen)
	if (!step || index === -1) return null
	const next = sizes[index + step]
	return next && next.stock > 0 ? next.label : null
}

/**
 * Where the fit marker sits on a small → large scale, 0..100 (50 = true to size).
 * @param counts `{ small, true, large }`
 */
export const fitPosition = ({ small, large }, total) =>
	total ? Math.round(50 + (50 * (large - small)) / total) : 50
