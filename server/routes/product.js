const router = require('express').Router()
const Product = require('../models/Product')
const asyncHandler = require('../middleware/asyncHandler')
const { verifyTokenAndAdmin } = require('../middleware/verifyToken')

router.post(
	'/',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		res.status(201).json(await Product.create(req.body))
	})
)

router.put(
	'/:id',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const product = await Product.findByIdAndUpdate(
			req.params.id,
			{ $set: req.body },
			{ new: true, runValidators: true }
		)
		if (!product) return res.status(404).json({ message: 'Product not found' })
		res.status(200).json(product)
	})
)

router.delete(
	'/:id',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		await Product.findByIdAndDelete(req.params.id)
		res.status(200).json({ message: 'Product has been deleted' })
	})
)

// Public: single product
router.get(
	'/find/:id',
	asyncHandler(async (req, res) => {
		const product = await Product.findById(req.params.id)
		if (!product) return res.status(404).json({ message: 'Product not found' })
		res.status(200).json(product)
	})
)

// Public: product list. ?new=true -> 5 newest, ?category=x -> by category
router.get(
	'/',
	asyncHandler(async (req, res) => {
		const { new: qNew, category } = req.query
		let query = Product.find(category ? { categories: { $in: [String(category)] } } : {})
		if (qNew) query = query.sort({ createdAt: -1 }).limit(5)
		res.status(200).json(await query)
	})
)

module.exports = router
