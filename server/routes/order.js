const router = require('express').Router()
const Order = require('../models/Order')
const Product = require('../models/Product')
const asyncHandler = require('../middleware/asyncHandler')
const {
	verifyToken,
	verifyTokenAndAuth,
	verifyTokenAndAdmin,
} = require('../middleware/verifyToken')

// Create an order for the logged-in user. The amount is calculated on the server,
// never trusted from the client.
router.post(
	'/',
	verifyToken,
	asyncHandler(async (req, res) => {
		const { products = [], address } = req.body
		if (!products.length || !address) {
			return res.status(400).json({ message: 'products and address are required' })
		}

		const dbProducts = await Product.find({ _id: { $in: products.map((p) => p.productId) } })
		const priceById = Object.fromEntries(dbProducts.map((p) => [p._id.toString(), p.price]))
		if (products.some((p) => priceById[p.productId] === undefined)) {
			return res.status(400).json({ message: 'Unknown product in order' })
		}
		const amount = products.reduce(
			(sum, p) => sum + priceById[p.productId] * (p.quantity || 1),
			0
		)

		const order = await Order.create({ userId: req.user.id, products, address, amount })
		res.status(201).json(order)
	})
)

router.put(
	'/:id',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const order = await Order.findByIdAndUpdate(
			req.params.id,
			{ $set: { status: req.body.status } },
			{ new: true, runValidators: true }
		)
		if (!order) return res.status(404).json({ message: 'Order not found' })
		res.status(200).json(order)
	})
)

router.delete(
	'/:id',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		await Order.findByIdAndDelete(req.params.id)
		res.status(200).json({ message: 'Order has been deleted' })
	})
)

router.get(
	'/find/:userId',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		res.status(200).json(await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 }))
	})
)

router.get(
	'/',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		res.status(200).json(await Order.find())
	})
)

// Monthly income for the last two months (admin dashboard)
router.get(
	'/income',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const since = new Date()
		since.setMonth(since.getMonth() - 2)
		const income = await Order.aggregate([
			{ $match: { createdAt: { $gte: since } } },
			{ $project: { month: { $month: '$createdAt' }, sales: '$amount' } },
			{ $group: { _id: '$month', total: { $sum: '$sales' } } },
		])
		res.status(200).json(income)
	})
)

module.exports = router
