import { Product } from '../models/Product.js'
import { badRequest, conflict } from '../utils/HttpError.js'

/**
 * Loads products for the given line items and validates the chosen options.
 *
 * @param items `[{ productId, quantity, size, color? }]`, already validated by zod
 * @param options.requireStock reject items without enough stock in the chosen size (orders)
 * @returns the same items with the loaded `product` attached
 * @throws 400 for unknown/hidden products or invalid options, 409 for missing stock
 */
export const resolveLineItems = async (items, { requireStock = false } = {}) => {
	const ids = [...new Set(items.map((item) => item.productId))]
	const products = await Product.find({ _id: { $in: ids }, active: true }).lean()
	const productsById = new Map(products.map((product) => [product._id.toString(), product]))

	const invalid = []
	const outOfStock = []

	const resolved = items.map((item, index) => {
		const product = productsById.get(item.productId)
		const path = `items.${index}`

		if (!product) {
			invalid.push({ path: `${path}.productId`, message: 'Product not found' })
			return null
		}

		const size = product.sizes.find((s) => s.label === item.size)
		if (!size)
			invalid.push({ path: `${path}.size`, message: `Size "${item.size}" is not available` })

		if (product.colors.length && !product.colors.includes(item.color)) {
			invalid.push({ path: `${path}.color`, message: 'Please choose an available color' })
		}

		if (requireStock && size && size.stock < item.quantity) {
			outOfStock.push({
				path,
				message: size.stock
					? `Only ${size.stock} left of "${product.title}" in size ${size.label}`
					: `"${product.title}" is sold out in size ${size.label}`,
			})
		}
		return { ...item, product }
	})

	if (invalid.length) throw badRequest('Some items are invalid', invalid)
	if (outOfStock.length) throw conflict('Some items are out of stock', outOfStock)
	return resolved
}
