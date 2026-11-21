import crypto from 'node:crypto'
import { Order } from '../models/Order.js'
import { notFound } from '../utils/HttpError.js'
import { hasPermission } from './permissions.js'

/** A secret that lets a guest open, pay or cancel their order. */
export const createOrderToken = () => crypto.randomBytes(24).toString('base64url')

const tokensMatch = (given, expected) =>
	Boolean(given && expected) &&
	given.length === expected.length &&
	crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))

/** The guest token sent by the client (never in the query string, so it stays out of logs). */
export const readOrderToken = (req) => req.get('x-order-token')

/**
 * Loads an order the requester may access: its customer, staff with the "orders" permission,
 * or a guest with the order's token. Everyone else gets 404, so order ids cannot be probed.
 */
export const findAccessibleOrder = async (req, orderId) => {
	const order = await Order.findById(orderId).select('+accessToken')
	const allowed =
		order &&
		(hasPermission(req.user, 'orders') ||
			(req.user && order.user?.toString() === req.user.id) ||
			tokensMatch(readOrderToken(req), order.accessToken))
	if (!allowed) throw notFound('Order')
	return order
}
