const router = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const asyncHandler = require('../middleware/asyncHandler')
const { verifyTokenAndAuth, verifyTokenAndAdmin } = require('../middleware/verifyToken')

// Update own profile (only whitelisted fields; isAdmin can be changed by admins only)
router.put(
	'/:id',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		const update = {}
		for (const key of ['username', 'email']) {
			if (req.body[key] !== undefined) update[key] = req.body[key]
		}
		if (req.body.password) update.password = await bcrypt.hash(req.body.password, 10)
		if (req.user.isAdmin && req.body.isAdmin !== undefined) update.isAdmin = !!req.body.isAdmin

		const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
		if (!user) return res.status(404).json({ message: 'User not found' })
		res.status(200).json(user)
	})
)

router.delete(
	'/:id',
	verifyTokenAndAuth,
	asyncHandler(async (req, res) => {
		await User.findByIdAndDelete(req.params.id)
		res.status(200).json({ message: 'User has been deleted' })
	})
)

router.get(
	'/find/:id',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const user = await User.findById(req.params.id)
		if (!user) return res.status(404).json({ message: 'User not found' })
		res.status(200).json(user)
	})
)

router.get(
	'/',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const users = req.query.new
			? await User.find().sort({ _id: -1 }).limit(5)
			: await User.find()
		res.status(200).json(users)
	})
)

router.get(
	'/stats',
	verifyTokenAndAdmin,
	asyncHandler(async (req, res) => {
		const lastYear = new Date()
		lastYear.setFullYear(lastYear.getFullYear() - 1)

		const data = await User.aggregate([
			{ $match: { createdAt: { $gte: lastYear } } },
			{ $project: { month: { $month: '$createdAt' } } },
			{ $group: { _id: '$month', total: { $sum: 1 } } },
		])
		res.status(200).json(data)
	})
)

module.exports = router
