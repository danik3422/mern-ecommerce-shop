const router = require('express').Router()
const Cart = require('../models/Cart')
const asyncHandler = require('../middleware/asyncHandler')
const { verifyTokenAndAuth, verifyTokenAndAdmin } = require('../middleware/verifyToken')

// Get the cart of a user
router.get(
	'/find/:userId',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		const cart = await Cart.findOne({ userId: req.params.userId })
		res.status(200).json(cart || { userId: req.params.userId, products: [] })
	})
)

// Create or replace the cart of a user (one cart per user)
router.put(
	'/:userId',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		const cart = await Cart.findOneAndUpdate(
			{ userId: req.params.userId },
			{ $set: { products: req.body.products || [] } },
			{ new: true, upsert: true, runValidators: true }
		)
		res.status(200).json(cart)
	})
)

router.delete(
	'/:userId',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		await Cart.findOneAndDelete({ userId: req.params.userId })
		res.status(200).json({ message: 'Cart has been deleted' })
	})
)

router.get(
	'/',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		res.status(200).json(await Cart.find())
	})
)

module.exports = router
