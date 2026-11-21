import { Order } from '../models/Order.js'
import { HttpError, notFound } from '../utils/HttpError.js'
import { expireCheckoutSession, refundPayment } from './payments.js'
import { sendOrderEmail } from './orderEmails.js'
import { releasePromo } from './promoCodes.js'
import { releaseStock } from './stock.js'

/** Allowed status changes; everything else is rejected with 409. */
const NEXT_STATUSES = {
	pending: ['paid', 'cancelled'],
	paid: ['shipped', 'cancelled'],
	shipped: ['delivered'],
	delivered: [],
	cancelled: [],
}

const previousStatuses = (status) =>
	Object.keys(NEXT_STATUSES).filter((from) => NEXT_STATUSES[from].includes(status))

/**
 * Refunds `amount` of an order paid through Stripe and records it.
 * @returns true when Stripe refunded it; false when there is nothing to refund online
 *   (unpaid or paid on delivery) or Stripe failed — then the shop refunds manually
 */
export const refundOrderPayment = async (order, amount, reason) => {
	const paymentIntentId = order.payment?.paymentIntentId
	if (!paymentIntentId || amount <= 0) return false
	try {
		await refundPayment({ paymentIntentId, amount, reason })
		await Order.updateOne({ _id: order._id }, { $inc: { 'payment.refunded': amount } })
		return true
	} catch (err) {
		console.error(`Refund of ${amount} for order ${order._id} failed — refund manually:`, err)
		return false
	}
}

/**
 * Changes the order status if the transition is allowed.
 *
 * The current status is part of the update filter, so concurrent requests cannot both succeed —
 * this guarantees that reserved stock is returned exactly once when an order is cancelled.
 *
 * @param from limits the allowed current statuses further, e.g. customers may cancel only `['pending']`
 * @param filter extra conditions, e.g. `{ user }` for customers or `{ 'payment.sessionId': id }`
 * @param set extra fields to set together with the status
 * @returns the updated order, or null when the transition did not happen
 */
export const transitionOrder = async (orderId, status, { from, filter = {}, set = {} } = {}) => {
	const allowedFrom = previousStatuses(status).filter((current) => !from || from.includes(current))
	const order = await Order.findOneAndUpdate(
		{ _id: orderId, ...filter, status: { $in: allowedFrom } },
		{ $set: { status, ...set }, $push: { statusHistory: { status, at: new Date() } } },
		{ returnDocument: 'after' },
	)

	if (order && status === 'cancelled') {
		await releaseStock(order.items)
		if (order.promoCode) await releasePromo(order.promoCode)
		await expireCheckoutSession(order.payment?.sessionId)
		// a paid order that is cancelled gets its money back
		if (order.payment?.paidAt) await refundOrderPayment(order, order.amount, 'order cancelled')
	}
	if (order) await sendOrderEmail(order._id, status)
	return order
}

/** Like transitionOrder, but explains a failed transition with 404 or 409. */
export const transitionOrderOrThrow = async (orderId, status, options = {}) => {
	const order = await transitionOrder(orderId, status, options)
	if (order) return order

	const current = await Order.findOne({ _id: orderId, ...options.filter }).lean()
	if (!current) throw notFound('Order')
	throw new HttpError(409, `A ${current.status} order cannot become ${status}`)
}
