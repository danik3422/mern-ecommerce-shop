/**
 * The customer's view of an order's progress (pure functions, easy to test).
 *
 * Steps: placed → paid → shipped → delivered, or placed (→ paid) → cancelled,
 * followed by the return events. Every step is `{ key, at?, state }` where state is
 * 'done', 'current' (the latest step reached — highlighted) or 'upcoming'.
 */

/** Carriers the shop ships with — same ids as CARRIERS in server/src/models/Order.js. */
export const CARRIER_IDS = ['inpost', 'dpd', 'dhl', 'poczta', 'gls', 'other']

const FULFILMENT = ['pending', 'paid', 'shipped', 'delivered']

/** When the order last entered `status` (status history, or the older date fields). */
const reachedAt = (order, status) => {
	const fromHistory = order.statusHistory?.findLast((entry) => entry.status === status)?.at
	const fallback = {
		paid: order.payment?.paidAt,
		shipped: order.shippedAt,
		delivered: order.deliveredAt,
		cancelled: order.updatedAt,
	}[status]
	return fromHistory ?? fallback
}

/** Return events with their dates; a decision is either an approval or a rejection. */
const returnSteps = (request) => {
	if (!request) return []
	const steps = [{ key: 'returnRequested', at: request.requestedAt }]
	if (request.status === 'rejected') steps.push({ key: 'returnRejected', at: request.decidedAt })
	if (['approved', 'refunded'].includes(request.status)) {
		steps.push({ key: 'returnApproved', at: request.decidedAt })
	}
	if (request.status === 'refunded') steps.push({ key: 'returnRefunded', at: request.refundedAt })
	return steps.map((step) => ({ ...step, state: 'done' }))
}

/** @returns `[{ key, at?, state }]` in the order they happen */
export const buildTimeline = (order) => {
	const steps = [{ key: 'placed', at: order.createdAt, state: 'done' }]

	if (order.status === 'cancelled') {
		const paidAt = order.payment?.paidAt
		if (paidAt) steps.push({ key: 'paid', at: paidAt, state: 'done' })
		steps.push({ key: 'cancelled', at: reachedAt(order, 'cancelled'), state: 'done' })
	} else {
		const reached = FULFILMENT.indexOf(order.status)
		const payOnDelivery = order.payment?.provider !== 'stripe'
		for (const [i, status] of FULFILMENT.entries()) {
			if (i === 0) continue
			if (i <= reached) {
				steps.push({ key: status, at: reachedAt(order, status), state: 'done' })
			} else {
				const key = status === 'paid' && payOnDelivery ? 'payOnDelivery' : status
				steps.push({ key, state: 'upcoming' })
			}
		}
		steps.push(...returnSteps(order.returnRequest))
	}

	const current = steps.findLastIndex((step) => step.state === 'done')
	steps[current] = { ...steps[current], state: 'current' }
	return steps
}
