import { User } from '../models/User.js'
import { subscribeToRestock } from '../services/stockAlerts.js'
import { badRequest } from '../utils/HttpError.js'

/** POST /products/:productId/stock-alerts — guests pass an email, customers may omit it */
export const createStockAlert = async (req, res) => {
	const { productId } = req.valid.params
	const { size } = req.valid.body
	let { email } = req.valid.body

	if (!email && req.user) email = (await User.findById(req.user.id).lean())?.email
	if (!email) throw badRequest('Please enter your email', [{ path: 'email', message: 'Required' }])

	await subscribeToRestock({ productId, size, email })
	res.status(201).json({ message: `We will email ${email} when size ${size} is back in stock` })
}
