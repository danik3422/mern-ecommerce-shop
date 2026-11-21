import { z } from 'zod'
import { SHIPPING_METHOD_IDS } from '../config/shop.js'
import { CARRIERS, ORDER_STATUSES, RETURN_REASONS } from '../models/Order.js'
import { address, email, lineItem, lineItems, locale } from './common.js'

const checkoutOptions = {
	// whether the method is enabled is checked when pricing (services/pricing.js);
	// without one the first enabled method is used
	shippingMethod: z.enum(SHIPPING_METHOD_IDS).optional(),
	promoCode: z.string().trim().max(40).optional(),
}

export const createOrderBody = z.strictObject({
	items: lineItems.min(1, 'Order must contain at least one item'),
	address,
	// required for guests; signed-in customers use their account email
	email: email.optional(),
	// the shop language at checkout: order emails are sent in it
	locale: locale.optional(),
	...checkoutOptions,
})

/** POST /checkout/quote — the totals the bag shows before ordering */
export const quoteBody = z.strictObject({
	items: lineItems,
	...checkoutOptions,
})

const isWebLink = (value) => {
	try {
		return ['http:', 'https:'].includes(new URL(value).protocol)
	} catch {
		return false
	}
}

/** A parcel: carrier, tracking number and an optional link (generated when empty). */
export const trackingBody = z.strictObject({
	carrier: z.enum(CARRIERS, 'Choose a carrier'),
	number: z
		.string()
		.trim()
		.min(4, 'Enter the tracking number')
		.max(40, 'Use at most 40 characters')
		.regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, 'Use letters, digits, spaces and dashes only'),
	url: z
		.string()
		.trim()
		.max(500, 'Use at most 500 characters')
		.refine((value) => value === '' || isWebLink(value), 'Enter a link starting with https://')
		.optional(),
})

/** PATCH /orders/:id/status — `tracking` may be given when the order is marked as shipped. */
export const updateOrderStatusBody = z
	.strictObject({ status: z.enum(ORDER_STATUSES), tracking: trackingBody.optional() })
	.refine((body) => !body.tracking || body.status === 'shipped', {
		message: 'Tracking can only be added when the order is shipped',
		path: ['tracking'],
	})

export const returnRequestBody = z.strictObject({
	items: z.array(lineItem).min(1, 'Choose at least one item').max(50),
	reason: z.enum(RETURN_REASONS),
	comment: z.string().trim().max(500).optional(),
})

export const returnDecisionBody = z.strictObject({
	status: z.enum(['approved', 'rejected', 'refunded']),
	note: z.string().trim().max(500).optional(),
})
