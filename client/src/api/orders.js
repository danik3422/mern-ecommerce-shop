import { http } from './client'

/**
 * Creates an order; stock is reserved on the server. Guests also send `email`.
 * @param order `{ items: [{ productId, quantity, size, color? }], address, shippingMethod?, promoCode?, email? }`
 * @returns {Promise<{ order, checkoutUrl: string | null, accessToken?: string }>}
 *   redirect to `checkoutUrl` when payments are on; guests get `accessToken` for their order
 */
export const createOrder = (order) => http.post('/orders', order).then((r) => r.data)

/** Guests prove access to their order with its token (sent as a header, not in the URL). */
const tokenHeaders = (token) => (token ? { headers: { 'X-Order-Token': token } } : {})

/** A single order of the signed-in customer, a guest (with `token`) or any order for admins. */
export const fetchOrder = (id, signal, token) =>
	http.get(`/orders/${id}`, { signal, ...tokenHeaders(token) }).then((r) => r.data)

/** Starts a new Stripe Checkout for a pending order. @returns {Promise<{ checkoutUrl }>} */
export const payOrder = (id, token) =>
	http.post(`/orders/${id}/pay`, null, tokenHeaders(token)).then((r) => r.data)

/** Cancels a pending order; reserved stock is returned. */
export const cancelOrder = (id, token) =>
	http.post(`/orders/${id}/cancel`, null, tokenHeaders(token)).then((r) => r.data)

export const orderKeys = {
	detail: (id) => ['orders', id],
	mine: ['orders', 'mine'],
}

/**
 * Requests a return for delivered items (customers, or guests with their token).
 * @param body `{ items: [{ productId, color, size, quantity }], reason, comment? }`
 * @returns the updated order
 */
export const requestReturn = (id, body, token) =>
	http.post(`/orders/${id}/return`, body, tokenHeaders(token)).then((r) => r.data)
