import { env } from '../config/env.js'
import { Order } from '../models/Order.js'
import { sendMail } from './mailer.js'
import { formatAmount } from './pricing.js'

const SUBJECTS = {
	placed: 'We received your order',
	paid: 'Payment received',
	shipped: 'Your order is on its way',
	delivered: 'Your order has been delivered',
	cancelled: 'Your order was cancelled',
}

const INTROS = {
	placed: 'Thank you for your order! We will let you know when it ships.',
	paid: 'We received your payment. Your order is being prepared.',
	shipped: 'Good news — your order has shipped.',
	delivered: 'Your order has been delivered. We hope you enjoy it!',
	cancelled: 'Your order was cancelled. If you paid for it, the money will be refunded.',
}

export const orderNumber = (order) => `#${order._id.toString().slice(-8).toUpperCase()}`

/** Customers open their account; guests get a link that carries the order's secret token. */
const orderLink = (order) => {
	const client = env.CLIENT_ORIGINS[0]
	return order.user
		? `${client}/account`
		: `${client}/checkout/success?order=${order._id}&token=${order.accessToken}`
}

const orderSummary = (order) =>
	[
		...order.items.map(
			(item) =>
				`${item.quantity} × ${item.brand} ${item.title} (${item.color}, ${item.size}) — ${formatAmount(item.price * item.quantity)}`,
		),
		'',
		order.discount ? `Discount: −${formatAmount(order.discount)}` : null,
		`${order.shippingMethod?.label ?? 'Shipping'}: ${order.shipping ? formatAmount(order.shipping) : 'free'}`,
		`Total: ${formatAmount(order.amount)}`,
	]
		.filter((line) => line !== null)
		.join('\n')

/**
 * Emails the customer about their order. Never throws: a mail problem must not undo
 * an order or a status change.
 * @param kind 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
 */
export const sendOrderEmail = async (orderOrId, kind) => {
	try {
		const order =
			typeof orderOrId === 'object' && orderOrId.accessToken !== undefined
				? orderOrId
				: await Order.findById(orderOrId._id ?? orderOrId)
						.select('+accessToken')
						.lean()
		if (!order?.email || !SUBJECTS[kind]) return

		await sendMail({
			to: order.email,
			subject: `${SUBJECTS[kind]} — order ${orderNumber(order)}`,
			text: [
				INTROS[kind],
				'',
				orderSummary(order),
				'',
				`View your order: ${orderLink(order)}`,
			].join('\n'),
		})
	} catch (err) {
		console.error(`Could not send the "${kind}" email:`, err)
	}
}
