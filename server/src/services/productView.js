/**
 * Public representation of a product: adds fields computed from stored data.
 * Use for every product sent to clients.
 */
export const toProductView = (product) => {
	const data = typeof product.toObject === 'function' ? product.toObject() : product
	const inStock = data.sizes.some((size) => size.stock > 0)
	const onSale = Boolean(data.compareAtPrice && data.compareAtPrice > data.price)
	const discountPercent = onSale ? Math.round((1 - data.price / data.compareAtPrice) * 100) : 0
	return { ...data, inStock, onSale, discountPercent }
}

export const LOW_STOCK_THRESHOLD = 3
