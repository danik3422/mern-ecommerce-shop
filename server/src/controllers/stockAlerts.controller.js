import { User } from '../models/User.js'
import { subscribeToRestock } from '../services/stockAlerts.js'
import { badRequest } from '../utils/HttpError.js'

/** POST /products/:productId/stock-alerts — guests pass an email, customers may omit it */
export const createStockAlert = async (req, res) => {
	const { productId } = req.valid.params
	const { color, size } = req.valid.body
	let { email, locale } = req.valid.body

	if (req.user && (!email || !locale)) {
		const user = await User.findById(req.user.id).lean()
		email ??= user?.email
		locale ??= user?.locale
	}
	if (!email) throw badRequest('Please enter your email', [{ path: 'email', message: 'Required' }])

	await subscribeToRestock({ productId, color, size, email, locale })
	res.status(201).json({ message: `We will email ${email} when size ${size} is back in stock` })
}
