/**
 * Shop settings shared with the client through GET /api/shop/config,
 * so prices and delivery options are defined in one place.
 */
export const SHOP = Object.freeze({
	currency: 'PLN',
	// orders from this subtotal (after discounts) ship for free with methods that allow it
	freeShippingFrom: 200,
	// delivered items can be returned for this many days
	returnWindowDays: 30,
	shippingMethods: [
		{ id: 'standard', label: 'Standard delivery', price: 14.99, freeShipping: true, days: [3, 5] },
		{ id: 'locker', label: 'Parcel locker', price: 9.99, freeShipping: true, days: [2, 3] },
		{ id: 'express', label: 'Express delivery', price: 29.99, freeShipping: false, days: [1, 2] },
	],
})

export const SHIPPING_METHOD_IDS = SHOP.shippingMethods.map((method) => method.id)

export const findShippingMethod = (id) => SHOP.shippingMethods.find((method) => method.id === id)
