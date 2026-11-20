import { SHOP, findShippingMethod } from '../config/shop.js'
import { badRequest } from '../utils/HttpError.js'

export const roundMoney = (value) => Math.round(value * 100) / 100

export const formatAmount = (value) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: SHOP.currency }).format(value)

const discountFor = (promo, subtotal) => {
	if (!promo) return 0
	if (promo.type === 'percent') return roundMoney((subtotal * Math.min(promo.value, 100)) / 100)
	if (promo.type === 'fixed') return Math.min(promo.value, subtotal)
	return 0
}

/**
 * The price of an order — used for quotes in the bag and when the order is created,
 * so both always agree.
 *
 * @param items `[{ price, quantity }]`
 * @param options.shippingMethod id from SHOP.shippingMethods (default: standard)
 * @param options.promo a usable promo code document (see promoCodes.js), if any
 */
export const calculateTotals = (items, { shippingMethod = 'standard', promo } = {}) => {
	const method = findShippingMethod(shippingMethod)
	if (!method) throw badRequest('Unknown shipping method')

	const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
	const discount = discountFor(promo, subtotal)
	const discounted = roundMoney(subtotal - discount)
	const freeShipping =
		promo?.type === 'free_shipping' || (method.freeShipping && discounted >= SHOP.freeShippingFrom)
	const shipping = subtotal === 0 || freeShipping ? 0 : method.price

	return {
		subtotal,
		discount,
		shipping,
		amount: roundMoney(discounted + shipping),
		shippingMethod: { id: method.id, label: method.label, price: shipping },
		promoCode: promo?.code,
	}
}
