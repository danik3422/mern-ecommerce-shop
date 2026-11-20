/**
 * Shop settings shared with the client through GET /api/shop/config,
 * so prices and delivery options are defined in one place.
 */
export const SHOP = Object.freeze({
	currency: 'USD',
	// orders from this subtotal (after discounts) ship for free with methods that allow it
	freeShippingFrom: 50,
	// delivered items can be returned for this many days
	returnWindowDays: 30,
	shippingMethods: [
		{ id: 'standard', label: 'Standard delivery', price: 4.9, freeShipping: true, days: [3, 5] },
		{ id: 'locker', label: 'Parcel locker', price: 2.9, freeShipping: true, days: [2, 3] },
		{ id: 'express', label: 'Express delivery', price: 9.9, freeShipping: false, days: [1, 2] },
	],
})

export const SHIPPING_METHOD_IDS = SHOP.shippingMethods.map((method) => method.id)

export const findShippingMethod = (id) => SHOP.shippingMethods.find((method) => method.id === id)
