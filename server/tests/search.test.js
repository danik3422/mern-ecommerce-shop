import { describe, expect, it } from 'vitest'
import { Product } from '../src/models/Product.js'
import { editDistance, normalize, tokenize } from '../src/services/search.js'
import { api, createProduct } from './helpers.js'

/** A small catalog like the real one. */
const seedCatalog = async () => {
	const products = {
		jacket: await createProduct({
			title: 'Black Leather Jacket',
			brand: 'Aster & Co',
			categories: ['men', 'women', 'coats'],
			description: 'A biker jacket in soft leather.',
		}),
		coat: await createProduct({
			title: 'Sky Blue Wool Coat',
			brand: 'Aster & Co',
			categories: ['women', 'coats'],
			description: 'Double-breasted wool coat.',
		}),
		jeans: await createProduct({
			title: 'Classic Jeans',
			brand: 'Indigo Works',
			categories: ['men', 'jeans'],
			description: 'Straight leg denim.',
		}),
		tee: await createProduct({
			title: 'Essential White Tee',
			brand: 'Northline',
			categories: ['women', 'men', 'tshirts'],
			description: 'Heavy organic cotton.',
		}),
		hoodie: await createProduct({
			title: 'Heather Hoodie',
			brand: 'Velo',
			categories: ['men', 'women'],
			description: 'Brushed fleece inside.',
		}),
		bag: await createProduct({
			title: 'Red Top-Handle Bag',
			brand: 'Aster & Co',
			categories: ['accessories'],
			description: 'Structured leather bag.',
		}),
	}
	return products
}

const search = (q, params = {}) =>
	api()
		.get('/api/products')
		.query({ q, ...params })
		.expect(200)
		.then((res) => res.body)

const titles = (body) => body.items.map((product) => product.title)

describe('search helpers', () => {
	it('normalizes case and Polish diacritics', () => {
		expect(normalize('Płaszcze i KURTKI, Żółć')).toBe('plaszcze i kurtki, zolc')
		expect(tokenize('T-shirts & Co')).toEqual(['t', 'shirts', 'tshirts', 'co'])
	})

	it('counts insertions, deletions, substitutions and swaps as one edit', () => {
		expect(editDistance('jeens', 'jeans')).toBe(1)
		expect(editDistance('jaket', 'jacket')).toBe(1)
		expect(editDistance('jakcet', 'jacket')).toBe(1)
		expect(editDistance('nortline', 'northline')).toBe(1)
		expect(editDistance('abc', 'xyz')).toBe(3)
	})
})

describe('GET /api/products?q= (typo tolerant)', () => {
	it('finds products despite typos and reports the corrected query', async () => {
		await seedCatalog()

		const jeans = await search('jeens')
		expect(titles(jeans)).toEqual(['Classic Jeans'])
		expect(jeans.search).toEqual({ query: 'jeens', correctedQuery: 'jeans' })

		const jacket = await search('jaket')
		expect(titles(jacket)).toEqual(['Black Leather Jacket'])
		expect(jacket.search.correctedQuery).toBe('jacket')

		expect((await search('black jaket')).search.correctedQuery).toBe('black jacket')
	})

	it('finds a brand with a typo', async () => {
		await seedCatalog()
		const body = await search('nortline')
		expect(titles(body)).toEqual(['Essential White Tee'])
		expect(body.search.correctedQuery).toBe('northline')
	})

	it('ignores Polish diacritics and understands Polish category names and words', async () => {
		await seedCatalog()
		// "Płaszcze i kurtki" is the Polish name of the coats category
		expect(titles(await search('plaszcz')).sort()).toEqual([
			'Black Leather Jacket',
			'Sky Blue Wool Coat',
		])
		expect(titles(await search('płaszcze i kurtki'))).toHaveLength(2)
		expect(titles(await search('sweter'))).toEqual(['Heather Hoodie'])
		expect(titles(await search('torebka'))).toEqual(['Red Top-Handle Bag'])
		expect((await search('plaszcz')).search.correctedQuery).toBeNull()
	})

	it('ranks brand and title matches above the rest, prefixes included', async () => {
		const { jacket } = await seedCatalog()
		// a description-only match ("leather" bag) ranks below the title match
		const body = await search('leather')
		expect(titles(body)).toEqual(['Black Leather Jacket', 'Red Top-Handle Bag'])
		expect(body.search.correctedQuery).toBeNull()

		// prefix while typing; the coat matches through its category "Coats & jackets"
		expect(titles(await search('jack'))).toEqual([jacket.title, 'Sky Blue Wool Coat'])
		expect(titles(await search('aster')).sort()).toEqual([
			'Black Leather Jacket',
			'Red Top-Handle Bag',
			'Sky Blue Wool Coat',
		])
	})

	it('returns nothing for garbage instead of loose matches', async () => {
		await seedCatalog()
		for (const garbage of ['xqzvt', 'asdfgh', 'qwerty', 'zzzz', 'kot']) {
			const body = await search(garbage)
			expect(body.total, garbage).toBe(0)
			expect(body.search.correctedQuery).toBeNull()
		}
	})

	it('searches exactly what was typed with exact=true', async () => {
		await seedCatalog()
		const body = await search('jaket', { exact: 'true' })
		expect(body.total).toBe(0)
		expect(body.search.correctedQuery).toBeNull()
	})

	it('sorts by relevance unless another sort is chosen, and combines with filters', async () => {
		await seedCatalog()
		// the coat matches "coat" in its title; the jacket only through its category
		expect(titles(await search('coat'))).toEqual(['Sky Blue Wool Coat', 'Black Leather Jacket'])
		const byPrice = await search('coat', { sort: 'price_desc' })
		expect(byPrice.items).toHaveLength(2)
		expect(titles(await search('coat', { category: 'men' }))).toEqual(['Black Leather Jacket'])
	})

	it('picks up product changes and hides inactive products', async () => {
		const { jeans } = await seedCatalog()
		expect((await search('jeans')).total).toBe(1)

		await Product.updateOne({ _id: jeans._id }, { title: 'Classic Chinos' })
		expect((await search('chinos')).total).toBe(1)

		await Product.updateOne({ _id: jeans._id }, { active: false })
		expect((await search('chinos')).total).toBe(0)
	})

	it('uses the search for the facets too', async () => {
		await seedCatalog()
		const res = await api().get('/api/products/facets').query({ q: 'nortline' }).expect(200)
		expect(res.body.brands).toEqual([{ value: 'Northline', count: 1 }])
	})
})

describe('GET /api/products/suggestions', () => {
	it('suggests products, brands and categories for a misspelled query', async () => {
		await seedCatalog()
		const res = await api().get('/api/products/suggestions').query({ q: 'aster' }).expect(200)
		expect(res.body.brands).toEqual([{ value: 'Aster & Co', count: 3 }])
		expect(res.body.total).toBe(3)

		const typo = await api().get('/api/products/suggestions').query({ q: 'nortlin' }).expect(200)
		expect(typo.body.brands).toEqual([{ value: 'Northline', count: 1 }])
		expect(typo.body.products.map((p) => p.title)).toEqual(['Essential White Tee'])
		expect(typo.body.correctedQuery).toBe('northline')

		const category = await api().get('/api/products/suggestions').query({ q: 'plaszcze' })
		expect(category.body.categories).toEqual(['coats'])
	})

	it('requires a query', async () => {
		await api().get('/api/products/suggestions').expect(400)
	})
})
