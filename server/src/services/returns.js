import { Order } from '../models/Order.js'
import { badRequest, conflict, notFound } from '../utils/HttpError.js'
import { sendMail } from './mailer.js'
import { emailLanguage, renderEmail } from './emails/render.js'
import { itemLine, orderLocale, orderNumber } from './orderEmails.js'
import { refundOrderPayment } from './orderStatus.js'
import { roundMoney } from './pricing.js'
import { getShopSettings } from './shopSettings.js'
import { releaseStock } from './stock.js'

const DAY_MS = 24 * 60 * 60 * 1000
const lineKey = (item) => `${item.productId}|${item.color ?? ''}|${item.size}`

/**
 * Last day a delivered order can be returned, or null when it was not delivered.
 * @param returnWindowDays from the shop settings
 */
export const returnDeadline = (order, returnWindowDays) =>
	order.deliveredAt
		? new Date(new Date(order.deliveredAt).getTime() + returnWindowDays * DAY_MS)
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
	const { returnWindowDays } = await getShopSettings()
	if (now > returnDeadline(order, returnWindowDays)) {
		throw conflict(`Returns are possible within ${returnWindowDays} days of delivery`)
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

/**
 * The content of a return email in the customer's language, without sending it.
 * @param status the return status the customer is told about
 */
export const buildReturnEmail = (order, status, { locale, settings }) => {
	const { m, f } = emailLanguage(locale)
	const t = m.returns[status]
	const request = order.returnRequest
	const count = request.items.reduce((sum, item) => sum + item.quantity, 0)
	const amount = f.money(request.refundAmount ?? 0)

	const paragraphs = [
		status === 'refunded'
			? t.intro({ amount, online: Boolean(request.refundedOnline) })
			: typeof t.intro === 'function'
				? t.intro({ count }, f)
				: t.intro,
	]
	if (request.note) paragraphs.push(`${m.returns.note}: ${request.note}`)

	return renderEmail(locale, settings, {
		subject: t.subject({ number: orderNumber(order) }),
		heading: t.heading,
		name: order.address?.fullName?.trim().split(/\s+/)[0],
		paragraphs,
		items: {
			title: m.returns.itemsTitle,
			lines: request.items.map((item) => ({ text: itemLine(item, m) })),
			totals:
				status === 'rejected'
					? []
					: [{ label: m.returns.refundAmount, value: amount, strong: true }],
		},
	})
}

/** Emails the customer about their return. Never throws. */
const notifyCustomer = async (order, status) => {
	try {
		const data = typeof order.toObject === 'function' ? order.toObject() : order
		const [locale, settings] = await Promise.all([orderLocale(data), getShopSettings()])
		await sendMail({ to: data.email, ...buildReturnEmail(data, status, { locale, settings }) })
	} catch (err) {
		console.error('Could not send the return email:', err)
	}
}
