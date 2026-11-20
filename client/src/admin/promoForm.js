/** Pure helpers for the promo code form (values are strings while editing). */

export const PROMO_TYPE_LABELS = {
	percent: 'Percentage off',
	fixed: 'Amount off',
	free_shipping: 'Free shipping',
}

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export const emptyPromoForm = () => ({
	code: '',
	description: '',
	type: 'percent',
	value: '',
	minSubtotal: '',
	startsAt: '',
	endsAt: '',
	maxUses: '',
	active: true,
})

export const promoToForm = (promo) => ({
	code: promo.code,
	description: promo.description ?? '',
	type: promo.type,
	value: promo.type === 'free_shipping' ? '' : String(promo.value),
	minSubtotal: promo.minSubtotal ? String(promo.minSubtotal) : '',
	startsAt: toDateInput(promo.startsAt),
	endsAt: toDateInput(promo.endsAt),
	maxUses: promo.maxUses ? String(promo.maxUses) : '',
	active: promo.active,
})

const numberOr = (value, fallback) => (value === '' ? fallback : Number(value))

/**
 * Form values → request body. Empty optional limits are sent as `null`,
 * which removes them when editing. The end date includes the whole day.
 */
export const formToPromo = (form) => ({
	code: form.code.trim(),
	description: form.description.trim(),
	type: form.type,
	value: form.type === 'free_shipping' ? 0 : numberOr(form.value, 0),
	minSubtotal: numberOr(form.minSubtotal, 0),
	startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
	endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
	maxUses: form.maxUses === '' ? null : Number(form.maxUses),
	active: form.active,
})

/** "20% off", "$5.00 off", "Free shipping" */
export const describeDiscount = (promo, formatMoney) => {
	if (promo.type === 'percent') return `${promo.value}% off`
	if (promo.type === 'fixed') return `${formatMoney(promo.value)} off`
	return 'Free shipping'
}

/** Active, scheduled, expired, used up or off — for the status column. */
export const promoStatus = (promo, now = new Date()) => {
	if (!promo.active) return 'off'
	if (promo.startsAt && new Date(promo.startsAt) > now) return 'scheduled'
	if (promo.endsAt && new Date(promo.endsAt) < now) return 'expired'
	if (promo.maxUses && promo.usedCount >= promo.maxUses) return 'used up'
	return 'active'
}
