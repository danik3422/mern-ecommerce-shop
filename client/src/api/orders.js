import { http } from './client'

/**
 * Creates an order; stock is reserved on the server.
 * @param order `{ items: [{ productId, quantity, size, color? }], address }`
 * @returns {Promise<{ order, checkoutUrl: string | null }>} redirect to `checkoutUrl` when payments are on
 */
export const createOrder = (order) => http.post('/orders', order).then((r) => r.data)

/** A single order of the signed-in user (admins: any order). */
export const fetchOrder = (id, signal) => http.get(`/orders/${id}`, { signal }).then((r) => r.data)

/** Starts a new Stripe Checkout for a pending order. @returns {Promise<{ checkoutUrl }>} */
export const payOrder = (id) => http.post(`/orders/${id}/pay`).then((r) => r.data)

/** Cancels a pending order of the signed-in user; reserved stock is returned. */
export const cancelOrder = (id) => http.post(`/orders/${id}/cancel`).then((r) => r.data)

export const orderKeys = {
	detail: (id) => ['orders', id],
	mine: ['orders', 'mine'],
}
