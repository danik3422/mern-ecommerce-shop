// Keep in sync with client/src/cart/pricing.js, which shows the same numbers before checkout
export const SHIPPING_COST = 4.9
export const FREE_SHIPPING_FROM = 50

export const roundMoney = (value) => Math.round(value * 100) / 100

/** @param items `[{ price, quantity }]` */
export const calculateTotals = (items) => {
	const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
	const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST
	return { subtotal, shipping, amount: roundMoney(subtotal + shipping) }
}
