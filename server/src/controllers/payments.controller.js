import { Order } from '../models/Order.js'
import { refundOrderPayment, transitionOrder } from '../services/orderStatus.js'
import { isWebhookConfigured, parseWebhookEvent } from '../services/payments.js'
import { HttpError, badRequest } from '../utils/HttpError.js'

const orderIdOf = (session) => session.metadata?.orderId ?? session.client_reference_id

/**
 * Marks the order as paid. Repeated events are harmless: only a pending order can become paid.
 * A payment for an order that was cancelled meanwhile is refunded right away.
 */
const handlePaidSession = async (session) => {
	if (session.payment_status !== 'paid') return

	const orderId = orderIdOf(session)
	const payment = {
		'payment.paidAt': new Date(),
		'payment.sessionId': session.id,
		'payment.paymentIntentId': session.payment_intent,
	}
	const order = await transitionOrder(orderId, 'paid', { set: payment })
	if (order) return

	// paid after it was cancelled (e.g. the session expired while the customer was paying)
	const cancelled = await Order.findOneAndUpdate(
		{ _id: orderId, status: 'cancelled', 'payment.paymentIntentId': { $exists: false } },
		{ $set: payment },
		{ returnDocument: 'after' },
	)
	if (cancelled) await refundOrderPayment(cancelled, cancelled.amount, 'order cancelled')
}

/** An unpaid session expired: cancel the order and return its stock, unless a newer session exists. */
const handleExpiredSession = (session) =>
	transitionOrder(orderIdOf(session), 'cancelled', {
		from: ['pending'],
		filter: { 'payment.sessionId': session.id },
	})

const HANDLERS = {
	'checkout.session.completed': handlePaidSession,
	// delayed payment methods (e.g. bank transfers) confirm later
	'checkout.session.async_payment_succeeded': handlePaidSession,
	'checkout.session.expired': handleExpiredSession,
}

/** POST /payments/webhook — called by Stripe with a signed raw body. */
export const stripeWebhook = async (req, res) => {
	if (!isWebhookConfigured()) throw new HttpError(503, 'Payment webhooks are not configured')

	let event
	try {
		event = parseWebhookEvent(req.body, req.get('stripe-signature'))
	} catch {
		throw badRequest('Invalid webhook signature')
	}

	await HANDLERS[event.type]?.(event.data.object)
	res.json({ received: true })
}
