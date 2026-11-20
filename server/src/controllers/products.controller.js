import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { toProductView } from '../services/productView.js'
import { notFound } from '../utils/HttpError.js'

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	price_asc: { price: 1, _id: 1 },
	price_desc: { price: -1, _id: 1 },
}

const buildFilter = ({ category, color, size, ids }) => {
	const filter = { active: true }
	if (category) filter.categories = category
	if (color) filter.colors = color
	if (size) filter['sizes.label'] = size
	if (ids) filter._id = { $in: ids }
	return filter
}

/** Finds an active product by Mongo id or by slug. */
export const findActiveProduct = (idOrSlug) =>
	Product.findOne({
		active: true,
		...(mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }),
	}).lean()

/** GET /products — public, paginated: `{ items, page, pages, total }` */
export const listProducts = async (req, res) => {
	const { sort, page, limit, ...filters } = req.valid.query
	const filter = buildFilter(filters)

	const [items, total] = await Promise.all([
		Product.find(filter)
			.sort(SORTS[sort])
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		Product.countDocuments(filter),
	])

	res.json({ items: items.map(toProductView), page, pages: Math.ceil(total / limit), total })
}

/** GET /products/:id — by id or slug */
export const getProduct = async (req, res) => {
	const product = await findActiveProduct(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

export const createProduct = async (req, res) => {
	const product = await Product.create(req.valid.body)
	res.status(201).json(toProductView(product))
}

export const updateProduct = async (req, res) => {
	const product = await Product.findByIdAndUpdate(req.valid.params.id, req.valid.body, {
		returnDocument: 'after',
		runValidators: true,
	})
	if (!product) throw notFound('Product')
	res.json(toProductView(product))
}

export const deleteProduct = async (req, res) => {
	const product = await Product.findByIdAndDelete(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.status(204).end()
}
