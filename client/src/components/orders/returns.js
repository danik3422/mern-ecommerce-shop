/** Reason codes; the English labels are used in the admin panel, the shop translates them. */
export const RETURN_REASONS = [
	{ value: 'too_small', label: 'Too small' },
	{ value: 'too_big', label: 'Too big' },
	{ value: 'not_as_described', label: 'Not as described' },
	{ value: 'damaged', label: 'Arrived damaged' },
	{ value: 'changed_mind', label: 'Changed my mind' },
	{ value: 'other', label: 'Other' },
]

export const returnReasonLabel = (value) =>
	RETURN_REASONS.find((reason) => reason.value === value)?.label ?? value

const DAY_MS = 24 * 60 * 60 * 1000

/** Last day to return a delivered order (window from the shop config), or null. */
export const returnDeadline = (order, windowDays) =>
	order.deliveredAt && windowDays
		? new Date(new Date(order.deliveredAt).getTime() + windowDays * DAY_MS)
		: null

export const canRequestReturn = (order, windowDays, now = new Date()) =>
	order.status === 'delivered' &&
	!order.returnRequest &&
	Boolean(returnDeadline(order, windowDays)) &&
	now <= returnDeadline(order, windowDays)
