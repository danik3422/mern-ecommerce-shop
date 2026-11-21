import { User } from '../models/User.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import { signAccessToken } from '../services/token.js'
import { conflict, forbidden, unauthorized } from '../utils/HttpError.js'

const authResponse = (user) => ({ user: user.toJSON(), accessToken: signAccessToken(user._id) })

export const register = async (req, res) => {
	const { username, email, password } = req.valid.body

	const taken = await User.exists({ $or: [{ username }, { email }] })
	if (taken) throw conflict('Username or email is already taken')

	// a parallel request may still win the race — the unique index then returns 409 as well
	const user = await User.create({
		username,
		email,
		passwordHash: await hashPassword(password),
		// signing up also signs in
		lastLoginAt: new Date(),
	})
	res.status(201).json(authResponse(user))
}

export const login = async (req, res) => {
	const { login, password } = req.valid.body

	const user = await User.findOne({
		$or: [{ username: login }, { email: login.toLowerCase() }],
	}).select('+passwordHash')

	const passwordMatches = user?.passwordHash && (await verifyPassword(password, user.passwordHash))
	if (!passwordMatches) throw unauthorized('Wrong username/email or password')
	// told only after the right password, so blocking does not reveal which accounts exist
	if (user.blocked) throw forbidden('This account is blocked. Please contact the shop.')

	user.lastLoginAt = new Date()
	await User.updateOne({ _id: user._id }, { lastLoginAt: user.lastLoginAt })

	res.json(authResponse(user))
}
