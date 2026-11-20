/** Category tiles on the home page. */
export const CATEGORIES = [
	{
		slug: 'women',
		title: 'Women',
		description: 'Tees, knitwear and everyday layers',
		img: '/images/site/category-women.jpg',
	},
	{
		slug: 'men',
		title: 'Men',
		description: 'Tees, denim and outerwear',
		img: '/images/products/black-leather-jacket-2.jpg',
	},
	{
		slug: 'dresses',
		title: 'Dresses',
		description: 'From wrap dresses to maxis',
		img: '/images/products/floral-wrap-dress.jpg',
	},
	{
		slug: 'coats',
		title: 'Coats & jackets',
		description: 'Layers for cold days',
		img: '/images/site/category-coats.jpg',
	},
]

/** Pseudo-category: /products/sale lists discounted products of all categories. */
export const SALE_CATEGORY = 'sale'

export const NAV_LINKS = [
	{ to: '/products/women', label: 'Women' },
	{ to: '/products/men', label: 'Men' },
	{ to: '/products/dresses', label: 'Dresses' },
	{ to: '/products/coats', label: 'Coats' },
	{ to: '/products/jeans', label: 'Denim' },
	{ to: '/products/accessories', label: 'Accessories' },
	{ to: `/products/${SALE_CATEGORY}`, label: 'Sale' },
]

/** Page titles for category slugs that read better than the capitalized slug. */
export const CATEGORY_TITLES = {
	jeans: 'Jeans & trousers',
	tshirts: 'T-shirts',
	coats: 'Coats & jackets',
	[SALE_CATEGORY]: 'Sale',
}

export const SORT_OPTIONS = [
	{ value: 'newest', label: 'Newest' },
	{ value: 'price_asc', label: 'Price: low to high' },
	{ value: 'price_desc', label: 'Price: high to low' },
	{ value: 'rating', label: 'Top rated' },
	{ value: 'discount', label: 'Biggest discount' },
]

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
