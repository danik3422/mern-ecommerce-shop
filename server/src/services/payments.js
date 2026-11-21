import Stripe from 'stripe'
import { env } from '../config/env.js'
import { CURRENCY as SHOP_CURRENCY } from '../config/shop.js'
import { HttpError } from '../utils/HttpError.js'

/**
 * The only module that talks to Stripe, so tests can replace it with vi.mock.
 * Payments are optional: without STRIPE_SECRET_KEY orders stay unpaid ("pay later").
 */

// Stripe allows 30 minutes to 24 hours; unpaid orders release their stock when the session expires
const SESSION_LIFETIME_SECONDS = 60 * 60
const CURRENCY = SHOP_CURRENCY.toLowerCase()

let client

const stripe = () => {
	if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, 'Online payments are not configured')
	client ??= new Stripe(env.STRIPE_SECRET_KEY)
	return client
}

export const isPaymentsEnabled = () => Boolean(env.STRIPE_SECRET_KEY)

export const isWebhookConfigured = () => Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)

const toCents = (amount) => Math.round(amount * 100)

/** Stripe can only show product images that are reachable over HTTPS. */
const publicImageUrls = (image, clientUrl) => {
	const url = new URL(image, clientUrl)
	return url.protocol === 'https:' ? [url.href] : undefined
}

/**
 * Creates a Checkout Session for a pending order.
 * @returns {Promise<{ id: string, url: string }>}
 */
export const createCheckoutSession = async (order, { accessToken } = {}) => {
	const clientUrl = env.CLIENT_ORIGINS[0]
	const orderId = order._id.toString()
	const tokenParam = accessToken ? `&token=${encodeURIComponent(accessToken)}` : ''

	const lineItems = order.items.map((item) => ({
		quantity: item.quantity,
		price_data: {
			currency: CURRENCY,
			unit_amount: toCents(item.price),
			product_data: {
				name: `${item.brand} ${item.title}`,
				description: [item.color, `size ${item.size}`].filter(Boolean).join(', '),
				images: publicImageUrls(item.image, clientUrl),
			},
		},
	}))

	if (order.shipping > 0) {
		lineItems.push({
			quantity: 1,
			price_data: {
				currency: CURRENCY,
				unit_amount: toCents(order.shipping),
				product_data: { name: order.shippingMethod?.label ?? 'Shipping' },
			},
		})
	}

	// Stripe line items cannot be negative, so a discount becomes a one-time coupon
	const discounts =
		order.discount > 0
			? [
					{
						coupon: (
							await stripe().coupons.create({
								amount_off: toCents(order.discount),
								currency: CURRENCY,
								duration: 'once',
								name: order.promoCode ? `Promo ${order.promoCode}` : 'Discount',
							})
						).id,
					},
				]
			: undefined

	const session = await stripe().checkout.sessions.create({
		mode: 'payment',
		line_items: lineItems,
		discounts,
		client_reference_id: orderId,
		metadata: { orderId },
		// guests come back with their order token so the result page can load the order
		success_url: `${clientUrl}/checkout/success?order=${orderId}${tokenParam}`,
		cancel_url: `${clientUrl}/checkout/cancel?order=${orderId}${tokenParam}`,
		expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
	})

	return { id: session.id, url: session.url }
}

/** Expires an open session so it can no longer be paid. Errors are ignored (it may be closed already). */
export const expireCheckoutSession = async (sessionId) => {
	if (!sessionId || !isPaymentsEnabled()) return
	try {
		await stripe().checkout.sessions.expire(sessionId)
	} catch {
		// already expired or completed — nothing to do
	}
}

/**
 * Refunds (part of) a payment. @returns the Stripe refund id
 * @throws when Stripe rejects the refund — callers decide how to report it
 */
export const refundPayment = async ({ paymentIntentId, amount, reason }) => {
	const refund = await stripe().refunds.create({
		payment_intent: paymentIntentId,
		amount: toCents(amount),
		metadata: reason ? { reason } : undefined,
	})
	return refund.id
}

/**
 * Verifies the Stripe signature and returns the event.
 * @param rawBody the unparsed request body (Buffer)
 * @throws when the signature is invalid
 */
export const parseWebhookEvent = (rawBody, signature) =>
	stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
