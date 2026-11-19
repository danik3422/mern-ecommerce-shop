import { User } from '../models/User.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import { signAccessToken } from '../services/token.js'
import { conflict, unauthorized } from '../utils/HttpError.js'

const authResponse = (user) => ({ user: user.toJSON(), accessToken: signAccessToken(user._id) })

export const register = async (req, res) => {
	const { username, email, password } = req.valid.body

	const taken = await User.exists({ $or: [{ username }, { email }] })
	if (taken) throw conflict('Username or email is already taken')

	// a parallel request may still win the race — the unique index then returns 409 as well
	const user = await User.create({ username, email, passwordHash: await hashPassword(password) })
	res.status(201).json(authResponse(user))
}

export const login = async (req, res) => {
	const { login, password } = req.valid.body

	const user = await User.findOne({
		$or: [{ username: login }, { email: login.toLowerCase() }],
	}).select('+passwordHash')

	const passwordMatches = user?.passwordHash && (await verifyPassword(password, user.passwordHash))
	if (!passwordMatches) throw unauthorized('Wrong username/email or password')

	res.json(authResponse(user))
}
