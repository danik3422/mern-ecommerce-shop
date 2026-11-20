import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { toProductView } from '../services/productView.js'
import { conflict, notFound } from '../utils/HttpError.js'
import { MAX_ADDRESSES } from '../validation/account.js'

const loadUser = async (userId) => {
	const user = await User.findById(userId)
	if (!user) throw notFound('User')
	return user
}

/* ---------- Wishlist ---------- */

const toIds = (wishlist = []) => wishlist.map(String)

/** GET /account/wishlist/ids — cheap list for heart buttons */
export const getWishlistIds = async (req, res) => {
	const user = await User.findById(req.user.id, { wishlist: 1 }).lean()
	res.json(toIds(user?.wishlist))
}

/** GET /account/wishlist — active products, most recently added first */
export const getWishlist = async (req, res) => {
	const user = await User.findById(req.user.id, { wishlist: 1 }).lean()
	const ids = toIds(user?.wishlist)
	const products = await Product.find({ _id: { $in: ids }, active: true }).lean()
	const byId = new Map(products.map((product) => [product._id.toString(), product]))

	const newestFirst = ids
		.toReversed()
		.map((id) => byId.get(id))
		.filter(Boolean)
	res.json(newestFirst.map(toProductView))
}

/** PUT /account/wishlist/:productId — idempotent; returns the ids */
export const addToWishlist = async (req, res) => {
	const { productId } = req.valid.params
	if (!(await Product.exists({ _id: productId, active: true }))) throw notFound('Product')

	const user = await User.findByIdAndUpdate(
		req.user.id,
		{ $addToSet: { wishlist: productId } },
		{ returnDocument: 'after', projection: { wishlist: 1 } },
	).lean()
	res.json(toIds(user.wishlist))
}

/** DELETE /account/wishlist/:productId — idempotent; returns the ids */
export const removeFromWishlist = async (req, res) => {
	const user = await User.findByIdAndUpdate(
		req.user.id,
		{ $pull: { wishlist: req.valid.params.productId } },
		{ returnDocument: 'after', projection: { wishlist: 1 } },
	).lean()
	res.json(toIds(user.wishlist))
}

/* ---------- Address book ---------- */

/** Keeps exactly one default address when there are any. */
const normalizeDefault = (addresses, preferredId) => {
	if (!addresses.length) return
	const preferred = preferredId && addresses.id(preferredId)
	const chosen = preferred ?? addresses.find((a) => a.isDefault) ?? addresses[0]
	for (const address of addresses) address.isDefault = address === chosen
}

const defaultFirst = (user) =>
	user.addresses.toObject().sort((a, b) => Number(b.isDefault) - Number(a.isDefault))

export const listAddresses = async (req, res) => {
	res.json(defaultFirst(await loadUser(req.user.id)))
}

export const createAddress = async (req, res) => {
	const user = await loadUser(req.user.id)
	if (user.addresses.length >= MAX_ADDRESSES) {
		throw conflict(`You can save up to ${MAX_ADDRESSES} addresses`)
	}

	const { isDefault, ...fields } = req.valid.body
	const address = user.addresses.create(fields)
	user.addresses.push(address)
	normalizeDefault(user.addresses, isDefault ? address._id : undefined)
	await user.save()

	res.status(201).json(user.addresses.id(address._id))
}

export const updateAddress = async (req, res) => {
	const user = await loadUser(req.user.id)
	const address = user.addresses.id(req.valid.params.id)
	if (!address) throw notFound('Address')

	const { isDefault, ...fields } = req.valid.body
	address.set(fields)
	// `isDefault: false` is ignored: one address always stays the default
	if (isDefault) normalizeDefault(user.addresses, address._id)
	await user.save()

	res.json(address)
}

export const deleteAddress = async (req, res) => {
	const user = await loadUser(req.user.id)
	const address = user.addresses.id(req.valid.params.id)
	if (!address) throw notFound('Address')

	address.deleteOne()
	normalizeDefault(user.addresses)
	await user.save()

	res.status(204).end()
}
