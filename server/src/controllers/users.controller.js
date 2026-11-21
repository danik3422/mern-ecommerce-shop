import { Cart } from '../models/Cart.js'
import { User } from '../models/User.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import { revokeUserSessions } from '../services/sessions.js'
import { forbidden, notFound } from '../utils/HttpError.js'

/** Shared demo accounts stay usable for everyone: their profile cannot change. */
const DEMO_LOCKED = 'Demo accounts cannot change the profile, password or delete the account'

/**
 * Deletes the account — with its wishlist and address book, which live on the user
 * document — and its cart. Kept on purpose:
 * - orders: business records needed for accounting and refunds;
 * - reviews: they carry a username snapshot and stay useful for other shoppers.
 */
const deleteAccount = async (userId) => {
	// staff accounts are removed under Team, where the last owner is protected
	const user = await User.findOneAndDelete({ _id: userId, role: 'customer' })
	if (!user) {
		if (await User.exists({ _id: userId })) throw forbidden('Staff accounts are managed in Team')
		throw notFound('User')
	}
	await Promise.all([Cart.deleteOne({ user: userId }), revokeUserSessions(userId, 'removed')])
}

export const getMe = async (req, res) => {
	res.json(await User.findById(req.user.id))
}

export const updateMe = async (req, res) => {
	const { username, email, newPassword, currentPassword, locale } = req.valid.body
	const user = await User.findById(req.user.id).select('+passwordHash')
	// the language is a preference, not part of the profile: demo accounts may switch it too
	if (user.isDemo && (username || email || newPassword)) throw forbidden(DEMO_LOCKED)

	if (email || newPassword) {
		const confirmed = await verifyPassword(currentPassword, user.passwordHash)
		if (!confirmed) throw forbidden('Current password is incorrect')
	}

	if (username) user.username = username
	if (email) user.email = email
	if (newPassword) user.passwordHash = await hashPassword(newPassword)
	if (locale) user.locale = locale

	await user.save() // a taken username/email results in 409 via the unique index
	// whoever knew the old password may be signed in elsewhere: only this device stays
	if (newPassword) {
		await revokeUserSessions(user._id, 'password', { exceptSessionId: req.user.sessionId })
	}
	res.json(user)
}

export const deleteMe = async (req, res) => {
	if (await User.exists({ _id: req.user.id, isDemo: true })) throw forbidden(DEMO_LOCKED)
	await deleteAccount(req.user.id)
	res.status(204).end()
}

export const listUsers = async (req, res) => {
	const users = await User.find({ role: 'customer' })
		.sort({ createdAt: -1 })
		.limit(req.valid.query.limit)
		.lean()
	res.json(users)
}

export const getUser = async (req, res) => {
	const user = await User.findById(req.valid.params.id)
	if (!user) throw notFound('User')
	res.json(user)
}

export const deleteUser = async (req, res) => {
	await deleteAccount(req.valid.params.id)
	res.status(204).end()
}

/** GET /users/stats — new users per month for the last 12 months */
export const userStats = async (_req, res) => {
	const since = new Date()
	since.setFullYear(since.getFullYear() - 1)

	const stats = await User.aggregate([
		{ $match: { createdAt: { $gte: since } } },
		{
			$group: {
				_id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
				total: { $sum: 1 },
			},
		},
		{ $sort: { '_id.year': 1, '_id.month': 1 } },
	])
	res.json(stats)
}
