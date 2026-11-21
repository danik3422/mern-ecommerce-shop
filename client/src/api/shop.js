import { http } from './client'

/**
 * Public shop settings. `freeShippingFrom` is null when there is no free shipping;
 * only enabled delivery methods are listed (`label` in English, `labels` per language).
 * @returns {Promise<{ currency, freeShippingFrom, returnWindowDays, lowStockThreshold,
 *   shippingMethods: [{ id, label, labels: { en, pl }, price, freeShipping, days }],
 *   shopName, contact: { email, phone }, announcement: { en, pl } | null }>}
 */
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
