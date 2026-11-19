import { Product } from '../models/Product.js'
import { notFound } from '../utils/HttpError.js'

const SORTS = {
	newest: { createdAt: -1, _id: -1 },
	price_asc: { price: 1, _id: 1 },
	price_desc: { price: -1, _id: 1 },
}

const buildFilter = ({ category, color, size, ids }) => {
	const filter = {}
	if (category) filter.categories = category
	if (color) filter.color = color
	if (size) filter.size = size
	if (ids) filter._id = { $in: ids }
	return filter
}

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

	res.json({ items, page, pages: Math.ceil(total / limit), total })
}

export const getProduct = async (req, res) => {
	const product = await Product.findById(req.valid.params.id).lean()
	if (!product) throw notFound('Product')
	res.json(product)
}

export const createProduct = async (req, res) => {
	const product = await Product.create(req.valid.body)
	res.status(201).json(product)
}

export const updateProduct = async (req, res) => {
	const product = await Product.findByIdAndUpdate(req.valid.params.id, req.valid.body, {
		returnDocument: 'after',
		runValidators: true,
	})
	if (!product) throw notFound('Product')
	res.json(product)
}

export const deleteProduct = async (req, res) => {
	const product = await Product.findByIdAndDelete(req.valid.params.id)
	if (!product) throw notFound('Product')
	res.status(204).end()
}
