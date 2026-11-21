/** Pure helpers for the admin tracking forms. */
import { CARRIER_IDS } from '../components/orders/timeline'

export const CARRIER_NAMES = {
	inpost: 'InPost',
	dpd: 'DPD',
	dhl: 'DHL',
	poczta: 'Poczta Polska',
	gls: 'GLS',
	other: 'Other carrier',
}

export const CARRIER_OPTIONS = CARRIER_IDS.map((id) => ({ value: id, label: CARRIER_NAMES[id] }))

/** Form values from the order's tracking (or an empty form, InPost preselected). */
export const trackingToForm = (tracking) => ({
	carrier: tracking?.carrier ?? 'inpost',
	number: tracking?.number ?? '',
	url: tracking?.url ?? '',
})

/**
 * Form values → request body. An empty link is left out so the server generates it.
 * When the carrier or number changes but the link was left as it was (the generated one),
 * the link is left out as well, so it follows the new number.
 */
export const trackingBody = (form, previous) => {
	const number = form.number.trim()
	const url = form.url.trim()
	const parcelChanged =
		previous && (previous.carrier !== form.carrier || previous.number !== number)
	const staleLink = parcelChanged && url === (previous.url ?? '') && form.carrier !== 'other'
	return { carrier: form.carrier, number, ...(url && !staleLink && { url }) }
}
