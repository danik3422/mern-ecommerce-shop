import { SHOP } from '../config/shop.js'
import { resolveLineItems } from '../services/lineItems.js'
import { calculateTotals } from '../services/pricing.js'
import { findUsablePromo } from '../services/promoCodes.js'
import { toOrderItems } from './orders.controller.js'

/** GET /shop/config — currency, free-shipping threshold and delivery options */
export const getShopConfig = (_req, res) => {
	res.json(SHOP)
}

/**
 * POST /checkout/quote — the totals for a bag with a delivery method and promo code,
 * calculated exactly like the order will be. An unusable promo code is a 400 with a
 * `promoCode` field error, so the bag can show why.
 */
export const quote = async (req, res) => {
	const { items, shippingMethod, promoCode } = req.valid.body
	const orderItems = toOrderItems(await resolveLineItems(items))
	const promo = promoCode
		? await findUsablePromo(promoCode, calculateTotals(orderItems).subtotal)
		: undefined

	const totals = calculateTotals(orderItems, { shippingMethod, promo })
	res.json({
		...totals,
		promo: promo && { code: promo.code, type: promo.type, description: promo.description },
	})
}
