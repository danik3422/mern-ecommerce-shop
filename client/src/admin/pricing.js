/** Pure price helpers for admin forms; values are form strings ('' = empty). */

const parse = (value) => (value === '' || value == null ? null : Number(value))

/** Whole percent taken off `compareAtPrice`, or 0 when it is not a sale. */
export const discountPercent = (price, compareAtPrice) => {
	const now = parse(price)
	const before = parse(compareAtPrice)
	if (now === null || before === null || !(before > now)) return 0
	return Math.round((1 - now / before) * 100)
}

/**
 * Same rules as the API, checked before saving: `{ price?, compareAtPrice? }` messages.
 */
export const priceErrors = (price, compareAtPrice) => {
	const errors = {}
	const now = parse(price)
	const before = parse(compareAtPrice)
	if (now === null || Number.isNaN(now) || now < 0) errors.price = 'Enter a price of 0 or more'
	else if (before !== null && !(before > now)) {
		errors.compareAtPrice = 'Compare-at price must be higher than the price'
	}
	return errors
}

/**
 * What a bulk discount does to one product (mirrors server/src/services/adminProducts.js):
 * the percentage is taken off the regular price (the compare-at price during a sale).
 * @returns `{ price, compareAtPrice }` after the change; compareAtPrice null = no sale
 */
export const previewDiscount = ({ price, compareAtPrice }, percent) => {
	const onSale = compareAtPrice > price
	const regular = onSale ? compareAtPrice : price
	const discounted = Math.round(regular * (1 - percent / 100) * 100) / 100
	if (percent > 0 && discounted < regular && discounted > 0) {
		return { price: discounted, compareAtPrice: regular }
	}
	return { price: regular, compareAtPrice: null }
}
