/** Pure helpers for the shop settings form (numbers are strings while editing). */

export const DELIVERY_METHOD_NAMES = {
	standard: 'Standard',
	locker: 'Parcel locker',
	express: 'Express',
}

const COMPANY_FIELDS = ['name', 'street', 'postalCode', 'city', 'nip', 'bankAccount']

const text = (value) => (value === null || value === undefined ? '' : String(value))

/** Settings from GET /admin/settings → form values. */
export const settingsToForm = (settings) => ({
	shopName: settings.shopName,
	contactEmail: settings.contactEmail,
	contactPhone: settings.contactPhone,
	announcement: { en: settings.announcement.en, pl: settings.announcement.pl },
	// the seller on invoices; missing in settings saved before invoices existed
	company: Object.fromEntries(COMPANY_FIELDS.map((key) => [key, text(settings.company?.[key])])),
	freeShippingFrom: text(settings.freeShippingFrom),
	returnWindowDays: text(settings.returnWindowDays),
	lowStockThreshold: text(settings.lowStockThreshold),
	shippingMethods: settings.shippingMethods.map((method) => ({
		id: method.id,
		label: { en: method.label.en, pl: method.label.pl },
		price: text(method.price),
		freeShipping: method.freeShipping,
		days: method.days.map(text),
		enabled: method.enabled,
	})),
})

// an empty required number is sent as null, so the server answers with a field error
const numberOrNull = (value) => (value.trim() === '' ? null : Number(value))

/** Form values → PUT /admin/settings body. An empty free-shipping threshold turns it off. */
export const formToSettings = (form) => ({
	shopName: form.shopName.trim(),
	contactEmail: form.contactEmail.trim(),
	contactPhone: form.contactPhone.trim(),
	announcement: { en: form.announcement.en.trim(), pl: form.announcement.pl.trim() },
	company: Object.fromEntries(COMPANY_FIELDS.map((key) => [key, form.company[key].trim()])),
	freeShippingFrom: numberOrNull(form.freeShippingFrom),
	returnWindowDays: numberOrNull(form.returnWindowDays),
	lowStockThreshold: numberOrNull(form.lowStockThreshold),
	shippingMethods: form.shippingMethods.map((method) => ({
		id: method.id,
		label: { en: method.label.en.trim(), pl: method.label.pl.trim() },
		price: numberOrNull(method.price),
		freeShipping: method.freeShipping,
		days: method.days.map(numberOrNull),
		enabled: method.enabled,
	})),
})

/** True when the form differs from the saved settings. */
export const isFormChanged = (form, saved) => JSON.stringify(form) !== JSON.stringify(saved)
