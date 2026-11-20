/** The variant of a color; products with a single color accept a missing color. */
export const findVariant = (product, color) =>
	product.variants.find((variant) => variant.color === color) ??
	(product.variants.length === 1 && !color ? product.variants[0] : undefined)

/** Stock of a size in a variant (0 when the size does not exist). */
export const stockOf = (variant, size) => variant?.sizes.find((s) => s.label === size)?.stock ?? 0

export const isVariantInStock = (variant) => variant.sizes.some((size) => size.stock > 0)
