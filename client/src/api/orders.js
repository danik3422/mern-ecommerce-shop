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

/**
 * The VAT invoice of a paid order (404 before that): number, dates, seller, buyer, payment,
 * `lines: [{ kind, name, color?, size?, quantity, unitPrice, discount, net, vat, gross, vatRate }]`
 * and `totals: { net, vat, gross, byRate }` — amounts in PLN.
 */
export const fetchInvoice = (id, signal, token) =>
	http.get(`/orders/${id}/invoice`, { signal, ...tokenHeaders(token) }).then((r) => r.data)

export const orderKeys = {
	detail: (id) => ['orders', id],
	invoice: (id) => ['orders', id, 'invoice'],
	mine: ['orders', 'mine'],
}

/** The printable invoice page of an order; guests keep their token in the link. */
export const invoicePath = (orderId, token) =>
	`/orders/${orderId}/invoice${token ? `?token=${encodeURIComponent(token)}` : ''}`

/**
 * Requests a return for delivered items (customers, or guests with their token).
 * @param body `{ items: [{ productId, color, size, quantity }], reason, comment? }`
 * @returns the updated order
 */
export const requestReturn = (id, body, token) =>
	http.post(`/orders/${id}/return`, body, tokenHeaders(token)).then((r) => r.data)
