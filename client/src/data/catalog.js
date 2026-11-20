export const CATEGORIES = [
	{
		slug: 'women',
		title: 'Women',
		description: 'Shirts, tees and tops',
		img: '/images/site/category-women.jpg',
	},
	{
		slug: 'coats',
		title: 'Coats & jackets',
		description: 'Layers for cold days',
		img: '/images/site/category-coats.jpg',
	},
	{
		slug: 'jeans',
		title: 'Denim',
		description: 'Jeans and chambray',
		img: '/images/site/category-jeans.jpg',
	},
]

export const NAV_LINKS = [
	{ to: '/products', label: 'Shop all', end: true },
	{ to: '/products/women', label: 'Women' },
	{ to: '/products/coats', label: 'Coats' },
	{ to: '/products/jeans', label: 'Denim' },
	{ to: '/products/accessories', label: 'Accessories' },
]

export const COLOR_FILTERS = ['white', 'black', 'beige', 'gray', 'blue', 'brown', 'pink']
export const SIZE_FILTERS = ['XS', 'S', 'M', 'L', 'XL', '28', '30', '32', '34']
export const SORT_OPTIONS = [
	{ value: 'newest', label: 'Newest' },
	{ value: 'price_asc', label: 'Price: low to high' },
	{ value: 'price_desc', label: 'Price: high to low' },
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
}

export const swatchColor = (name) => SWATCHES[name] ?? name

/** Must match LOW_STOCK_THRESHOLD in server/src/services/productView.js */
export const LOW_STOCK_THRESHOLD = 3
