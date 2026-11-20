import { Product } from '../models/Product.js'
import { conflict } from '../utils/HttpError.js'

/**
 * Takes `quantity` from the chosen size only if enough is left — a single atomic update,
 * so two customers can never buy the same last item.
 */
const takeFromStock = async ({ productId, size, quantity }) => {
	const result = await Product.updateOne(
		{ _id: productId, sizes: { $elemMatch: { label: size, stock: { $gte: quantity } } } },
		{ $inc: { 'sizes.$.stock': -quantity } },
	)
	return result.modifiedCount === 1
}

/** Puts items back into stock (cancelled orders and failed reservations). */
export const releaseStock = (items) =>
	Promise.all(
		items.map(({ productId, size, quantity }) =>
			Product.updateOne(
				{ _id: productId, 'sizes.label': size },
				{ $inc: { 'sizes.$.stock': quantity } },
			),
		),
	)

/**
 * Reserves stock for all items or for none of them.
 * @param items resolved line items `{ productId, size, quantity, product }`
 * @throws 409 naming the item that could not be reserved
 */
export const reserveStock = async (items) => {
	const reserved = []

	for (const [index, item] of items.entries()) {
		if (await takeFromStock(item)) {
			reserved.push(item)
			continue
		}

		await releaseStock(reserved)
		throw conflict('Some items are out of stock', [
			{
				path: `items.${index}`,
				message: `Not enough "${item.product.title}" left in size ${item.size}`,
			},
		])
	}
}
