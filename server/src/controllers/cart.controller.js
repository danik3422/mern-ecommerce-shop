import { Cart } from '../models/Cart.js'
import { resolveLineItems } from '../services/lineItems.js'

const toResponse = (cart) => ({ items: cart?.items ?? [], updatedAt: cart?.updatedAt ?? null })

/** GET /cart — the cart of the current user (empty if none was saved yet) */
export const getMyCart = async (req, res) => {
	const cart = await Cart.findOne({ user: req.user.id }).lean()
	res.json(toResponse(cart))
}

/** PUT /cart — replaces the whole cart; items must reference real products and options */
export const replaceMyCart = async (req, res) => {
	const { items } = req.valid.body
	await resolveLineItems(items)

	const cart = await Cart.findOneAndUpdate(
		{ user: req.user.id },
		{ items },
		{ upsert: true, returnDocument: 'after', runValidators: true },
	).lean()
	res.json(toResponse(cart))
}

export const clearMyCart = async (req, res) => {
	await Cart.deleteOne({ user: req.user.id })
	res.status(204).end()
}
