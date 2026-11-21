/** Prices are always in this currency (not editable: Stripe and the storefront rely on it). */
export const CURRENCY = 'PLN'

/**
 * Delivery methods are a fixed set — orders and promo codes refer to them by id.
 * Admins can rename, re-price or disable them in the shop settings, not add or delete them.
 */
export const SHIPPING_METHOD_IDS = ['standard', 'locker', 'express']

function deepFreeze(value) {
	for (const child of Object.values(value)) {
		if (child && typeof child === 'object') deepFreeze(child)
	}
	return Object.freeze(value)
}

/**
 * Default shop settings: used until an admin saves the settings
 * (see services/shopSettings.js) and for fields missing in the stored document.
 */
export const SHOP_DEFAULTS = deepFreeze({
	shopName: 'Clothe Shop',
	contactEmail: '',
	contactPhone: '',
	// optional message for the storefront top bar
	announcement: { en: '', pl: '' },
	// the seller printed on invoices (empty name: the shop name is used)
	company: { name: '', street: '', postalCode: '', city: '', nip: '', bankAccount: '' },
	// orders from this subtotal (after discounts) ship for free with methods that allow it;
	// null = no free shipping
	freeShippingFrom: 200,
	// delivered items can be returned for this many days
	returnWindowDays: 30,
	// sizes with this many items or fewer count as "low stock"
	lowStockThreshold: 3,
	shippingMethods: [
		{
			id: 'standard',
			label: { en: 'Standard delivery', pl: 'Dostawa standardowa' },
			price: 14.99,
			freeShipping: true,
			days: [3, 5],
			enabled: true,
		},
		{
			id: 'locker',
			label: { en: 'Parcel locker', pl: 'Paczkomat' },
			price: 9.99,
			freeShipping: true,
			days: [2, 3],
			enabled: true,
		},
		{
			id: 'express',
			label: { en: 'Express delivery', pl: 'Dostawa ekspresowa' },
			price: 29.99,
			freeShipping: false,
			days: [1, 2],
			enabled: true,
		},
	],
})
