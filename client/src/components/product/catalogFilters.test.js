import { describe, expect, it } from 'vitest'
import {
	activeFilterChips,
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

		expect(chips.map((c) => c.label)).toEqual(['A', 'B', 'Size M', '$10 – $50', 'On sale'])
		expect(chips[0].change).toEqual({ brand: ['B'] })
		expect(chips[3].change).toEqual({ minPrice: '', maxPrice: '' })

		const fromOnly = activeFilterChips(readFilters(params('minPrice=10')))
		expect(fromOnly[0].label).toBe('From $10')
	})
})
