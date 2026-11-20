import { z } from 'zod'
import { SHIPPING_METHOD_IDS } from '../config/shop.js'
import { ORDER_STATUSES } from '../models/Order.js'
import { address, lineItems } from './common.js'

const checkoutOptions = {
	shippingMethod: z.enum(SHIPPING_METHOD_IDS).default('standard'),
	promoCode: z.string().trim().max(40).optional(),
}

export const createOrderBody = z.strictObject({
	items: lineItems.min(1, 'Order must contain at least one item'),
	address,
	...checkoutOptions,
})

/** POST /checkout/quote — the totals the bag shows before ordering */
export const quoteBody = z.strictObject({
	items: lineItems,
	...checkoutOptions,
})

export const updateOrderStatusBody = z.strictObject({ status: z.enum(ORDER_STATUSES) })
