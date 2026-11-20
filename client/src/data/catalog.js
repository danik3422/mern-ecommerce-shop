/** Category tiles on the home page; titles and descriptions are translated by slug. */
export const CATEGORIES = [
	{
		slug: 'women',
		img: '/images/site/category-women.jpg',
	},
	{
		slug: 'men',
		img: '/images/products/black-leather-jacket-2.jpg',
	},
	{
		slug: 'dresses',
		img: '/images/products/floral-wrap-dress.jpg',
	},
	{
		slug: 'coats',
		img: '/images/site/category-coats.jpg',
	},
]

/** Pseudo-category: /products/sale lists discounted products of all categories. */
export const SALE_CATEGORY = 'sale'

/** `labelKey` is a translation key (see i18n/messages). */
export const NAV_LINKS = [
	{ to: '/products/women', labelKey: 'nav.women' },
	{ to: '/products/men', labelKey: 'nav.men' },
	{ to: '/products/dresses', labelKey: 'nav.dresses' },
	{ to: '/products/coats', labelKey: 'nav.coats' },
	{ to: '/products/jeans', labelKey: 'nav.jeans' },
	{ to: '/products/accessories', labelKey: 'nav.accessories' },
	{ to: `/products/${SALE_CATEGORY}`, labelKey: 'nav.sale' },
]

/** Sort orders of the catalog; labels are translated as `sort.<value>`. */
export const SORT_VALUES = ['newest', 'price_asc', 'price_desc', 'rating', 'discount']

/** Muted swatch shades for color names stored on products; unknown names fall back to CSS colors. */
const SWATCHES = {
	white: '#f6f4ef',
	black: '#1c1c1c',
	beige: '#d8c6a5',
	gray: '#9b9a96',
	blue: '#3f5f8a',
	brown: '#a2593b',
	pink: '#e2a9a4',
	green: '#55704f',
	red: '#a8352e',
	orange: '#d9783a',
	yellow: '#e3c24d',
}

export const swatchColor = (name) => SWATCHES[name] ?? name

/** Color names with a designed swatch — suggested when editing products. */
export const COLOR_NAMES = Object.keys(SWATCHES)

/** Must match LOW_STOCK_THRESHOLD in server/src/services/productView.js */
export const LOW_STOCK_THRESHOLD = 3
