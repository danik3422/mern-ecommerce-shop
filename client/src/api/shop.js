import { http } from './client'

/** @returns {Promise<{ currency, freeShippingFrom, shippingMethods: [{ id, label, price, freeShipping, days }] }>} */
export const fetchShopConfig = () => http.get('/shop/config').then((r) => r.data)

/**
 * Totals for a bag exactly as an order would be charged.
 * @param body `{ items, shippingMethod?, promoCode? }`
 * @returns {Promise<{ subtotal, discount, shipping, amount, shippingMethod, promo? }>}
 */
export const fetchQuote = (body, signal) =>
	http.post('/checkout/quote', body, { signal }).then((r) => r.data)

export const shopKeys = {
	config: ['shop', 'config'],
	quote: (body) => ['checkout', 'quote', body],
}
