import { resolveLineItems } from '../services/lineItems.js'
import { calculateTotals, subtotalOf } from '../services/pricing.js'
import { findUsablePromo } from '../services/promoCodes.js'
import { getShopSettings, toPublicShopConfig } from '../services/shopSettings.js'
import { toOrderItems } from './orders.controller.js'

/**
 * GET /shop/config — currency, free-shipping threshold, enabled delivery options,
 * return window, shop name, contact details and the announcement
 */
export const getShopConfig = async (_req, res) => {
	res.json(toPublicShopConfig(await getShopSettings()))
}

/**
 * POST /checkout/quote — the totals for a bag with a delivery method and promo code,
 * calculated exactly like the order will be. An unusable promo code is a 400 with a
 * `promoCode` field error, so the bag can show why.
 */
export const quote = async (req, res) => {
	const { items, shippingMethod, promoCode } = req.valid.body
	const orderItems = toOrderItems(await resolveLineItems(items))
	const promo = promoCode ? await findUsablePromo(promoCode, subtotalOf(orderItems)) : undefined

	const totals = calculateTotals(orderItems, await getShopSettings(), { shippingMethod, promo })
	res.json({
		...totals,
		promo: promo && { code: promo.code, type: promo.type, description: promo.description },
	})
}
