import { z } from 'zod'
import { SHIPPING_METHOD_IDS } from '../config/shop.js'
import { ORDER_STATUSES, RETURN_REASONS } from '../models/Order.js'
import { address, email, lineItem, lineItems } from './common.js'

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
	...checkoutOptions,
})

/** POST /checkout/quote — the totals the bag shows before ordering */
export const quoteBody = z.strictObject({
	items: lineItems,
	...checkoutOptions,
})

export const updateOrderStatusBody = z.strictObject({ status: z.enum(ORDER_STATUSES) })

export const returnRequestBody = z.strictObject({
	items: z.array(lineItem).min(1, 'Choose at least one item').max(50),
	reason: z.enum(RETURN_REASONS),
	comment: z.string().trim().max(500).optional(),
})

export const returnDecisionBody = z.strictObject({
	status: z.enum(['approved', 'rejected', 'refunded']),
	note: z.string().trim().max(500).optional(),
})
