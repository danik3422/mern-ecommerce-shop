const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const asyncHandler = require('../middleware/asyncHandler')

const toPublic = (user) => {
	const { password, ...rest } = user.toObject()
	return rest
}

const signToken = (user) =>
	jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin }, process.env.JWT_SEC, {
		expiresIn: '3d',
	})

router.post(
	'/register',
	asyncHandler(async (req, res) => {
		const { username, email, password } = req.body
		if (!username || !email || !password || password.length < 6) {
			return res
				.status(400)
				.json({ message: 'username, email and password (min 6 chars) are required' })
		}

		const exists = await User.exists({ $or: [{ username }, { email: email.toLowerCase() }] })
		if (exists) return res.status(409).json({ message: 'User already exists' })

		const user = await User.create({
			username,
			email,
			password: await bcrypt.hash(password, 10),
		})
		res.status(201).json({ ...toPublic(user), accessToken: signToken(user) })
	})
)

router.post(
	'/login',
	asyncHandler(async (req, res) => {
		const { username, password } = req.body
		if (!username || !password) {
			return res.status(400).json({ message: 'username and password are required' })
		}

		// allow logging in by username or email
		const user = await User.findOne({
			$or: [{ username }, { email: String(username).toLowerCase() }],
		}).select('+password')

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(401).json({ message: 'Wrong credentials' })
		}

		res.status(200).json({ ...toPublic(user), accessToken: signToken(user) })
	})
)

module.exports = router
