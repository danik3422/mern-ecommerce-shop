/**
 * Catalog filter state lives in the URL query string, so a filtered list can be shared,
 * bookmarked and restored with the back button. These pure helpers translate between
 * URLSearchParams, a filters object and the API query.
 *
 * URL: ?q=coat&brand=Aster%20%26%20Co,Northline&color=black&size=M,L&minPrice=20&maxPrice=100
 *      &onSale=true&inStock=true&sort=price_asc&page=2
 * A search is typo tolerant; `&exact=true` searches for exactly what was typed.
 */
import { SALE_CATEGORY } from '../../data/catalog'
import { colorName } from '../../i18n/catalogText'

const LIST_KEYS = ['brand', 'color', 'size']
const PRICE_KEYS = ['minPrice', 'maxPrice']
const FLAG_KEYS = ['onSale', 'inStock']

export const DEFAULT_SORT = 'newest'
/** Search results are sorted by how well they match unless another sort is chosen. */
export const SEARCH_SORT = 'relevance'

/** The sort used when none is in the URL. */
export const defaultSortFor = (q) => (q ? SEARCH_SORT : DEFAULT_SORT)

const splitList = (value) => (value ? value.split(',').filter(Boolean) : [])

const readPrice = (value) => {
	if (value === null || value === '') return ''
	const number = Number(value)
	return Number.isFinite(number) && number >= 0 ? String(number) : ''
}

/**
 * @returns `{ q, exact, brand[], color[], size[], minPrice, maxPrice, onSale, inStock, sort, page }`
 */
export const readFilters = (searchParams) => {
	const q = searchParams.get('q')?.trim() ?? ''
	const sort = searchParams.get('sort')
	return {
		q,
		exact: Boolean(q) && searchParams.get('exact') === 'true',
		...Object.fromEntries(LIST_KEYS.map((key) => [key, splitList(searchParams.get(key))])),
		...Object.fromEntries(PRICE_KEYS.map((key) => [key, readPrice(searchParams.get(key))])),
		...Object.fromEntries(FLAG_KEYS.map((key) => [key, searchParams.get(key) === 'true'])),
		// "relevance" only makes sense for a search
		sort: sort && (sort !== SEARCH_SORT || q) ? sort : defaultSortFor(q),
		page: Math.max(1, Number(searchParams.get('page')) || 1),
	}
}

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
	if (next.get('sort') === defaultSortFor(next.get('q'))) next.delete('sort')
	return next
}

/** Removes every filter but keeps the search text (and whether it is exact). */
export const clearFilterParams = (searchParams) => {
	const next = new URLSearchParams()
	const q = searchParams.get('q')
	if (q) next.set('q', q)
	if (q && searchParams.get('exact') === 'true') next.set('exact', 'true')
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
	if (filters.exact) query.exact = 'true'
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
	if (filters.exact) scope.exact = 'true'
	return scope
}

/**
 * One chip per active filter value, each with the URL change that removes it.
 * Chips carry data, not text, so they can be shown in any language (see describeChip).
 * @returns `[{ key, kind, value?, min?, max?, change }]`
 */
export const activeFilterChips = (filters) => {
	const chips = []
	for (const key of LIST_KEYS) {
		for (const value of filters[key]) {
			chips.push({
				key: `${key}:${value}`,
				kind: key,
				value,
				change: { [key]: filters[key].filter((item) => item !== value) },
			})
		}
	}
	if (filters.minPrice !== '' || filters.maxPrice !== '') {
		chips.push({
			key: 'price',
			kind: 'price',
			min: filters.minPrice === '' ? undefined : Number(filters.minPrice),
			max: filters.maxPrice === '' ? undefined : Number(filters.maxPrice),
			change: { minPrice: '', maxPrice: '' },
		})
	}
	if (filters.onSale) chips.push({ key: 'onSale', kind: 'onSale', change: { onSale: false } })
	if (filters.inStock) chips.push({ key: 'inStock', kind: 'inStock', change: { inStock: false } })
	return chips
}

/** The text of a chip in the current language, e.g. "Rozmiar M" or "Od 40,00 zł". */
export const describeChip = (chip, { t, formatMoney }) => {
	switch (chip.kind) {
		case 'size':
			return t('filters.sizeChip', { size: chip.value })
		case 'color':
			return colorName(t, chip.value)
		case 'price':
			if (chip.min !== undefined && chip.max !== undefined) {
				return t('filters.range', { min: formatMoney(chip.min), max: formatMoney(chip.max) })
			}
			return chip.min !== undefined
				? t('filters.from', { amount: formatMoney(chip.min) })
				: t('filters.upTo', { amount: formatMoney(chip.max) })
		case 'onSale':
			return t('filters.onSale')
		case 'inStock':
			return t('filters.inStock')
		default:
			return chip.value
	}
}
