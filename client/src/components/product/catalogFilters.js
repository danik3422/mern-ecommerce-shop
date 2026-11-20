/**
 * Catalog filter state lives in the URL query string, so a filtered list can be shared,
 * bookmarked and restored with the back button. These pure helpers translate between
 * URLSearchParams, a filters object and the API query.
 *
 * URL: ?q=coat&brand=Aster%20%26%20Co,Northline&color=black&size=M,L&minPrice=20&maxPrice=100
 *      &onSale=true&inStock=true&sort=price_asc&page=2
 */
import { SALE_CATEGORY } from '../../data/catalog'

const LIST_KEYS = ['brand', 'color', 'size']
const PRICE_KEYS = ['minPrice', 'maxPrice']
const FLAG_KEYS = ['onSale', 'inStock']

export const DEFAULT_SORT = 'newest'

const splitList = (value) => (value ? value.split(',').filter(Boolean) : [])

const readPrice = (value) => {
	if (value === null || value === '') return ''
	const number = Number(value)
	return Number.isFinite(number) && number >= 0 ? String(number) : ''
}

/** @returns `{ q, brand[], color[], size[], minPrice, maxPrice, onSale, inStock, sort, page }` */
export const readFilters = (searchParams) => ({
	q: searchParams.get('q')?.trim() ?? '',
	...Object.fromEntries(LIST_KEYS.map((key) => [key, splitList(searchParams.get(key))])),
	...Object.fromEntries(PRICE_KEYS.map((key) => [key, readPrice(searchParams.get(key))])),
	...Object.fromEntries(FLAG_KEYS.map((key) => [key, searchParams.get(key) === 'true'])),
	sort: searchParams.get('sort') || DEFAULT_SORT,
	page: Math.max(1, Number(searchParams.get('page')) || 1),
})

/**
 * Applies changes to the current URL params. Empty values are removed.
 * Any change except a page change starts again from the first page.
 */
export const updateFilterParams = (searchParams, changes) => {
	const next = new URLSearchParams(searchParams)
	for (const [key, value] of Object.entries(changes)) {
		const serialized = Array.isArray(value) ? value.join(',') : value === false ? '' : value
		if (serialized === '' || serialized === null || serialized === undefined) next.delete(key)
		else next.set(key, String(serialized))
	}
	if (!('page' in changes)) next.delete('page')
	if (next.get('sort') === DEFAULT_SORT) next.delete('sort')
	return next
}

/** Removes every filter but keeps the search text. */
export const clearFilterParams = (searchParams) => {
	const next = new URLSearchParams()
	const q = searchParams.get('q')
	if (q) next.set('q', q)
	return next
}

export const toggleValue = (list, value) =>
	list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/** Builds the API query; `/products/sale` is a pseudo-category for discounted products. */
export const toApiQuery = (filters, category, limit) => {
	const query = { sort: filters.sort, page: filters.page, limit }
	if (category === SALE_CATEGORY) query.onSale = 'true'
	else if (category) query.category = category
	if (filters.q) query.q = filters.q
	for (const key of LIST_KEYS) if (filters[key].length) query[key] = filters[key].join(',')
	for (const key of PRICE_KEYS) if (filters[key] !== '') query[key] = filters[key]
	for (const key of FLAG_KEYS) if (filters[key]) query[key] = 'true'
	return query
}

/** Scope of the facet counts: the category and search, not the other filters. */
export const toFacetScope = (filters, category) => {
	const scope = {}
	if (category && category !== SALE_CATEGORY) scope.category = category
	if (filters.q) scope.q = filters.q
	return scope
}

const formatPrice = (value) => `$${value}`

/**
 * One chip per active filter value, each with the URL change that removes it.
 * @returns `[{ key, label, change }]`
 */
export const activeFilterChips = (filters) => {
	const chips = []
	for (const key of LIST_KEYS) {
		for (const value of filters[key]) {
			chips.push({
				key: `${key}:${value}`,
				label: key === 'size' ? `Size ${value}` : value,
				change: { [key]: filters[key].filter((item) => item !== value) },
			})
		}
	}
	if (filters.minPrice !== '' || filters.maxPrice !== '') {
		const label =
			filters.minPrice !== '' && filters.maxPrice !== ''
				? `${formatPrice(filters.minPrice)} – ${formatPrice(filters.maxPrice)}`
				: filters.minPrice !== ''
					? `From ${formatPrice(filters.minPrice)}`
					: `Up to ${formatPrice(filters.maxPrice)}`
		chips.push({ key: 'price', label, change: { minPrice: '', maxPrice: '' } })
	}
	if (filters.onSale) chips.push({ key: 'onSale', label: 'On sale', change: { onSale: false } })
	if (filters.inStock) chips.push({ key: 'inStock', label: 'In stock', change: { inStock: false } })
	return chips
}
