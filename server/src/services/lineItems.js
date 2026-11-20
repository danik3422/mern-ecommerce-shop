import { Product } from '../models/Product.js'
import { badRequest, conflict } from '../utils/HttpError.js'
import { findVariant } from './productView.js'

/**
 * Loads products for the given line items and validates the chosen color and size.
 *
 * @param items `[{ productId, quantity, size, color? }]`, already validated by zod;
 *   `color` may be omitted only for products with a single color
 * @param options.requireStock reject items without enough stock in the chosen variant (orders)
 * @returns the items with the loaded `product` and `variant` attached and `color` filled in
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

		const variant = findVariant(product, item.color)
		if (!variant) {
			invalid.push({ path: `${path}.color`, message: 'Please choose an available color' })
			return null
		}

		const size = variant.sizes.find((s) => s.label === item.size)
		if (!size) {
			invalid.push({ path: `${path}.size`, message: `Size "${item.size}" is not available` })
		} else if (requireStock && size.stock < item.quantity) {
			outOfStock.push({
				path,
				message: size.stock
					? `Only ${size.stock} left of "${product.title}" in ${variant.color}, size ${size.label}`
					: `"${product.title}" is sold out in ${variant.color}, size ${size.label}`,
			})
		}
		return { ...item, color: variant.color, product, variant }
	})

	if (invalid.length) throw badRequest('Some items are invalid', invalid)
	if (outOfStock.length) throw conflict('Some items are out of stock', outOfStock)
	return resolved
}
