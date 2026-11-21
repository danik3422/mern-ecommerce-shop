import { env } from '../config/env.js'

/**
 * Storefront links to an order, e.g. for emails. Guests get the order's secret token in the
 * link (load the order with `.select('+accessToken')`); customers sign in instead.
 */

const tokenQuery = (order) =>
	!order.user && order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : ''

/** The order page with the tracking timeline. */
export const orderPageUrl = (order) => {
	const client = env.CLIENT_ORIGINS[0]
	const id = order._id.toString()
	return order.user
		? `${client}/account/orders/${id}`
		: `${client}/checkout/success?order=${id}&token=${encodeURIComponent(order.accessToken ?? '')}`
}

/** The printable invoice page (it exists once `order.invoice` is set). */
export const invoiceUrl = (order) =>
	`${env.CLIENT_ORIGINS[0]}/orders/${order._id.toString()}/invoice${tokenQuery(order)}`
