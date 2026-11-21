import { describe, expect, it } from 'vitest'
import { DEFAULT_I18N as format } from '../../i18n/defaults'
import {
	activeFilterChips,
	describeChip,
	clearFilterParams,
	readFilters,
	toApiQuery,
	toFacetScope,
	toggleValue,
	updateFilterParams,
} from './catalogFilters'

const params = (query) => new URLSearchParams(query)

describe('catalog filters in the URL', () => {
	it('reads filters with defaults and ignores invalid values', () => {
		expect(readFilters(params(''))).toEqual({
			q: '',
			exact: false,
			brand: [],
			color: [],
			size: [],
			minPrice: '',
			maxPrice: '',
			onSale: false,
			inStock: false,
			sort: 'newest',
			page: 1,
		})

		const filters = readFilters(
			params(
				'q= coat &brand=Aster%20%26%20Co,Northline&size=M&minPrice=abc&maxPrice=80&onSale=true&page=0',
			),
		)
		expect(filters).toMatchObject({
			q: 'coat',
			brand: ['Aster & Co', 'Northline'],
			size: ['M'],
			minPrice: '',
			maxPrice: '80',
			onSale: true,
			page: 1,
		})
	})

	it('updates params, drops empty values and resets the page', () => {
		const next = updateFilterParams(params('q=tee&page=3&color=red'), {
			brand: ['A', 'B'],
			color: [],
			onSale: true,
		})
		expect(next.toString()).toBe('q=tee&brand=A%2CB&onSale=true')
	})

	it('keeps other params when only the page changes and omits the default sort', () => {
		expect(updateFilterParams(params('brand=A&sort=rating'), { page: 2 }).toString()).toBe(
			'brand=A&sort=rating&page=2',
		)
		expect(updateFilterParams(params('sort=rating'), { sort: 'newest' }).toString()).toBe('')
	})

	it('clears filters but keeps the search', () => {
		expect(clearFilterParams(params('q=coat&brand=A&inStock=true')).toString()).toBe('q=coat')
		expect(clearFilterParams(params('q=jaket&exact=true&brand=A')).toString()).toBe(
			'q=jaket&exact=true',
		)
	})

	it('sorts a search by relevance unless another sort is chosen', () => {
		expect(readFilters(params('q=coat')).sort).toBe('relevance')
		expect(readFilters(params('q=coat&sort=newest')).sort).toBe('newest')
		// relevance without a search falls back to the newest products
		expect(readFilters(params('sort=relevance')).sort).toBe('newest')
		// the default of each case is kept out of the URL
		expect(updateFilterParams(params('q=coat'), { sort: 'relevance' }).toString()).toBe('q=coat')
		expect(updateFilterParams(params('q=coat'), { sort: 'newest' }).toString()).toBe(
			'q=coat&sort=newest',
		)
	})

	it('passes an exact search to the API and the facets', () => {
		const filters = readFilters(params('q=jaket&exact=true'))
		expect(filters.exact).toBe(true)
		expect(toApiQuery(filters, undefined, 24)).toMatchObject({ q: 'jaket', exact: 'true' })
		expect(toFacetScope(filters)).toEqual({ q: 'jaket', exact: 'true' })
		// "exact" means nothing without a search
		expect(readFilters(params('exact=true')).exact).toBe(false)
	})

	it('toggles list values', () => {
		expect(toggleValue(['S'], 'M')).toEqual(['S', 'M'])
		expect(toggleValue(['S', 'M'], 'S')).toEqual(['M'])
	})

	it('builds the API query, mapping the sale pseudo-category to onSale', () => {
		const filters = readFilters(
			params('q=tee&size=S,M&maxPrice=50&inStock=true&sort=rating&page=2'),
		)
		expect(toApiQuery(filters, 'women', 24)).toEqual({
			category: 'women',
			q: 'tee',
			size: 'S,M',
			maxPrice: '50',
			inStock: 'true',
			sort: 'rating',
			page: 2,
			limit: 24,
		})
		expect(toApiQuery(readFilters(params('')), 'sale', 24)).toEqual({
			onSale: 'true',
			sort: 'newest',
			page: 1,
			limit: 24,
		})
	})

	it('scopes facets to the category and search only', () => {
		const filters = readFilters(params('q=coat&brand=A'))
		expect(toFacetScope(filters, 'coats')).toEqual({ category: 'coats', q: 'coat' })
		expect(toFacetScope(filters, 'sale')).toEqual({ q: 'coat' })
	})

	it('creates one removable chip per active value', () => {
		const filters = readFilters(params('brand=A,B&size=M&minPrice=10&maxPrice=50&onSale=true'))
		const chips = activeFilterChips(filters)

		expect(chips.map((c) => describeChip(c, format))).toEqual([
			'A',
			'B',
			'Size M',
			`${format.formatMoney(10)} – ${format.formatMoney(50)}`,
			'On sale',
		])
		expect(chips[0].change).toEqual({ brand: ['B'] })
		expect(chips[3].change).toEqual({ minPrice: '', maxPrice: '' })

		const fromOnly = activeFilterChips(readFilters(params('minPrice=10')))
		expect(describeChip(fromOnly[0], format)).toBe(`From ${format.formatMoney(10)}`)
	})
})
