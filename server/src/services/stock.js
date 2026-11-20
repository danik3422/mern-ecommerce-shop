import { Product } from '../models/Product.js'
import { conflict } from '../utils/HttpError.js'
import { notifyRestocked } from './stockAlerts.js'

/**
 * Takes `quantity` from one color and size only if enough is left — a single atomic update,
 * so two customers can never buy the same last item.
 *
 * The stock condition must be in the query, not only in `arrayFilters`: Mongoose adds
 * `updatedAt` to every update, so a document matched by `_id` alone counts as "modified"
 * even when no size was decremented.
 */
const takeFromStock = async ({ productId, color, size, quantity }) => {
	const result = await Product.updateOne(
		{
			_id: productId,
			variants: {
				$elemMatch: { color, sizes: { $elemMatch: { label: size, stock: { $gte: quantity } } } },
			},
		},
		{ $inc: { 'variants.$[v].sizes.$[s].stock': -quantity } },
		{ arrayFilters: [{ 'v.color': color }, { 's.label': size }] },
	)
	return result.modifiedCount === 1
}

/**
 * Puts items back into stock (cancelled orders and failed reservations)
 * and emails customers waiting for those sizes.
 */
export const releaseStock = async (items) => {
	await Promise.all(
		items.map(({ productId, color, size, quantity }) =>
			Product.updateOne(
				{ _id: productId },
				{ $inc: { 'variants.$[v].sizes.$[s].stock': quantity } },
				{ arrayFilters: [{ 'v.color': color }, { 's.label': size }] },
			),
		),
	)
	await notifyRestocked(items.map((item) => item.productId))
}

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
				message: `Not enough "${item.product.title}" left in ${item.color}, size ${item.size}`,
			},
		])
	}
}
