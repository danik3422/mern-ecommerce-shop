// Keep in sync with server/src/services/pricing.js — the server makes the final calculation
export const SHIPPING_COST = 4.9
export const FREE_SHIPPING_FROM = 50

const roundMoney = (value) => Math.round(value * 100) / 100

/** @param items `[{ price, quantity }]` */
export const calculateTotals = (items) => {
	const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0))
	const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST
	return { subtotal, shipping, total: roundMoney(subtotal + shipping) }
}
