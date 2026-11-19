import { Product } from '../models/Product.js'
import { badRequest, conflict } from '../utils/HttpError.js'

/** Checks that a chosen option (color/size) is one the product actually offers. */
const optionProblem = (offered, chosen, name) => {
	if (!offered.length) return chosen ? `This product has no ${name} options` : null
	if (!chosen) return `Please choose a ${name}`
	return offered.includes(chosen) ? null : `${name} "${chosen}" is not available`
}

/**
 * Loads products for the given line items and validates the chosen options.
 *
 * @param items `[{ productId, quantity, color?, size? }]`, already validated by zod
 * @param options.requireInStock reject items that are out of stock (used for orders)
 * @returns the same items with the loaded `product` attached
 * @throws 400 for unknown products or invalid options, 409 for out-of-stock items
 */
export const resolveLineItems = async (items, { requireInStock = false } = {}) => {
	const ids = [...new Set(items.map((item) => item.productId))]
	const products = await Product.find({ _id: { $in: ids } }).lean()
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

		const problems = [
			optionProblem(product.color, item.color, 'color'),
			optionProblem(product.size, item.size, 'size'),
		].filter(Boolean)
		invalid.push(...problems.map((message) => ({ path, message })))

		if (requireInStock && !product.inStock) {
			outOfStock.push({ path, message: `"${product.title}" is out of stock` })
		}
		return { ...item, product }
	})

	if (invalid.length) throw badRequest('Some items are invalid', invalid)
	if (outOfStock.length) throw conflict('Some items are out of stock', outOfStock)
	return resolved
}
