import { CURRENCY } from '../config/shop.js'
import { badRequest } from '../utils/HttpError.js'
import { findEnabledShippingMethod } from './shopSettings.js'

export const roundMoney = (value) => Math.round(value * 100) / 100

export const formatAmount = (value) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(value)

const discountFor = (promo, subtotal) => {
	if (!promo) return 0
	if (promo.type === 'percent') return roundMoney((subtotal * Math.min(promo.value, 100)) / 100)
	if (promo.type === 'fixed') return Math.min(promo.value, subtotal)
	return 0
}

/** Sum of `[{ price, quantity }]` before discounts and shipping. */
export const subtotalOf = (items) =>
	roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))

/**
 * The price of an order — used for quotes in the bag and when the order is created,
 * so both always agree.
 *
 * @param items `[{ price, quantity }]`
 * @param settings shop settings (see shopSettings.js) — delivery prices and free shipping
 * @param options.shippingMethod id of an enabled delivery method (default: the first enabled)
 * @param options.promo a usable promo code document (see promoCodes.js), if any
 */
export const calculateTotals = (items, settings, { shippingMethod, promo } = {}) => {
	const methodId = shippingMethod ?? settings.shippingMethods.find((m) => m.enabled)?.id
	const method = findEnabledShippingMethod(settings, methodId)
	if (!method) {
		throw badRequest('This delivery method is not available', [
			{ path: 'shippingMethod', message: 'Choose another delivery method' },
		])
	}

	const subtotal = subtotalOf(items)
	const discount = discountFor(promo, subtotal)
	const discounted = roundMoney(subtotal - discount)
	const threshold = settings.freeShippingFrom
	const freeShipping =
		promo?.type === 'free_shipping' ||
		(method.freeShipping && threshold != null && discounted >= threshold)
	const shipping = subtotal === 0 || freeShipping ? 0 : method.price

	return {
		subtotal,
		discount,
		shipping,
		amount: roundMoney(discounted + shipping),
		shippingMethod: { id: method.id, label: method.label.en, price: shipping },
		promoCode: promo?.code,
	}
}
