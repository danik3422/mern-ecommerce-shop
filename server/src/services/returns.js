import { SHOP } from '../config/shop.js'
import { Order } from '../models/Order.js'
import { badRequest, conflict, notFound } from '../utils/HttpError.js'
import { sendMail } from './mailer.js'
import { orderNumber } from './orderEmails.js'
import { refundOrderPayment } from './orderStatus.js'
import { formatAmount, roundMoney } from './pricing.js'
import { releaseStock } from './stock.js'

const DAY_MS = 24 * 60 * 60 * 1000
const lineKey = (item) => `${item.productId}|${item.color ?? ''}|${item.size}`

/** Last day a delivered order can be returned, or null when it was not delivered. */
export const returnDeadline = (order) =>
	order.deliveredAt
		? new Date(new Date(order.deliveredAt).getTime() + SHOP.returnWindowDays * DAY_MS)
		: null

/**
 * The refund for returned items: their prices minus the share of the order discount,
 * so a promo code is not refunded twice. Shipping is not refunded.
 */
export const refundFor = (order, items) => {
	const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
	const paidShare = order.subtotal ? (order.subtotal - (order.discount ?? 0)) / order.subtotal : 1
	return roundMoney(itemsTotal * paidShare)
}

/**
 * Opens a return for some items of a delivered order (one return per order).
 * @param items `[{ productId, color?, size, quantity }]` — must be lines of the order
 */
export const requestReturn = async (order, { items, reason, comment }, now = new Date()) => {
	if (order.status !== 'delivered') throw conflict('Only delivered orders can be returned')
	if (order.returnRequest) throw conflict('A return was already requested for this order')
	if (now > returnDeadline(order)) {
		throw conflict(`Returns are possible within ${SHOP.returnWindowDays} days of delivery`)
	}

	const ordered = new Map(order.items.map((item) => [lineKey(item), item]))
	const returned = items.map((item, index) => {
		const line = ordered.get(lineKey({ ...item, productId: String(item.productId) }))
		if (!line || item.quantity > line.quantity) {
			throw badRequest('Some items cannot be returned', [
				{ path: `items.${index}`, message: 'This item is not in the order in that quantity' },
			])
		}
		return { ...item, color: line.color, title: line.title, price: line.price }
	})

	const updated = await Order.findOneAndUpdate(
		{ _id: order._id, returnRequest: { $exists: false } },
		{
			$set: {
				returnRequest: {
					items: returned,
					reason,
					comment,
					refundAmount: refundFor(order, returned),
					requestedAt: now,
				},
			},
		},
		{ returnDocument: 'after' },
	)
	if (!updated) throw conflict('A return was already requested for this order')
	await notifyCustomer(updated, 'requested')
	return updated
}

const NEXT = { requested: ['approved', 'rejected'], approved: ['refunded'] }

/**
 * Admin decision on a return. "refunded" means the parcel arrived: the items go back
 * into stock and the money is refunded through Stripe when the order was paid online.
 * The status is part of the update filter, so a return is refunded only once.
 */
export const decideReturn = async (orderId, { status, note }) => {
	const order = await Order.findById(orderId).lean()
	if (!order) throw notFound('Order')
	const current = order.returnRequest?.status
	if (!current) throw notFound('Return request')
	if (!NEXT[current]?.includes(status)) {
		throw conflict(`A ${current} return cannot become ${status}`)
	}

	const now = new Date()
	const set = { 'returnRequest.status': status, 'returnRequest.decidedAt': now }
	if (note !== undefined) set['returnRequest.note'] = note
	if (status === 'refunded') set['returnRequest.refundedAt'] = now

	const updated = await Order.findOneAndUpdate(
		{ _id: orderId, 'returnRequest.status': current },
		{ $set: set },
		{ returnDocument: 'after' },
	)
	if (!updated) throw conflict('The return was changed meanwhile, please reload')

	if (status === 'refunded') {
		const { items, refundAmount } = updated.returnRequest.toObject()
		await releaseStock(items.map((item) => ({ ...item, productId: item.productId.toString() })))
		const online = await refundOrderPayment(updated, refundAmount, 'return')
		await Order.updateOne({ _id: orderId }, { 'returnRequest.refundedOnline': online })
		updated.returnRequest.refundedOnline = online
	}
	await notifyCustomer(updated, status)
	return updated
}

const MESSAGES = {
	requested: 'We received your return request and will review it shortly.',
	approved: 'Your return was approved. Please send the items back to us.',
	rejected: 'Unfortunately we cannot accept this return.',
	refunded: 'We received your return and refunded',
}

const notifyCustomer = async (order, status) => {
	const request = order.returnRequest
	const lines = [
		status === 'refunded'
			? `${MESSAGES.refunded} ${formatAmount(request.refundAmount)}${request.refundedOnline ? ' to your original payment method' : ''}.`
			: MESSAGES[status],
		request.note ? `\nNote from the shop: ${request.note}` : '',
		'',
		...request.items.map(
			(item) => `${item.quantity} × ${item.title} (${item.color}, ${item.size})`,
		),
	]
	try {
		await sendMail({
			to: order.email,
			subject: `Return for order ${orderNumber(order)}: ${status}`,
			text: lines.join('\n'),
		})
	} catch (err) {
		console.error('Could not send the return email:', err)
	}
}
