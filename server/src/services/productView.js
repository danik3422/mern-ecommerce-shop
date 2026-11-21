import { toLocalizedText } from '../utils/localized.js'

/** Finds the variant of a color; products with a single color accept a missing color. */
export const findVariant = (product, color) =>
	product.variants.find((variant) => variant.color === color) ??
	(product.variants.length === 1 && !color ? product.variants[0] : undefined)

/**
 * Public representation of a product: stored data plus fields computed from the variants.
 * `images` and `colors` are shortcuts for lists and cards (images of the first color).
 * `description` is always `{ en, pl }` (`pl` may be empty: clients fall back to English).
 * Use for every product sent to clients.
 */
export const toProductView = (product) => {
	const data = typeof product.toObject === 'function' ? product.toObject() : product
	const inStock = data.variants.some((variant) => variant.sizes.some((size) => size.stock > 0))
	const onSale = Boolean(data.compareAtPrice && data.compareAtPrice > data.price)
	const discountPercent = onSale ? Math.round((1 - data.price / data.compareAtPrice) * 100) : 0

	return {
		...data,
		description: toLocalizedText(data.description),
		images: data.variants[0]?.images ?? [],
		colors: data.variants.map((variant) => variant.color),
		inStock,
		onSale,
		discountPercent,
	}
}

export const LOW_STOCK_THRESHOLD = 3
