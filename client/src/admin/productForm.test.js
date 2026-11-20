import { describe, expect, it } from 'vitest'
import { slugify } from './format'
import { emptyProductForm, formToPayload, moveItem, productToForm } from './productForm'

const product = {
	title: 'Coat',
	slug: 'coat',
	brand: 'Aster',
	description: 'Warm',
	price: 80,
	compareAtPrice: 100,
	categories: ['coats'],
	colors: ['black'],
	sizes: [{ label: 'M', stock: 3 }],
	images: ['/images/coat.jpg'],
	active: false,
}

describe('product form helpers', () => {
	it('round-trips a product through the form', () => {
		const payload = formToPayload(productToForm(product), { isNew: false })
		expect(payload).toEqual(product)
	})

	it('converts numbers and trims text', () => {
		const form = {
			...emptyProductForm(),
			title: '  Tee ',
			price: '19.5',
			sizes: [{ label: ' S ', stock: '' }],
		}
		expect(formToPayload(form, { isNew: true })).toMatchObject({
			title: 'Tee',
			price: 19.5,
			sizes: [{ label: 'S', stock: 0 }],
		})
	})

	it('omits an empty compare-at price for new products and clears it on edit', () => {
		const form = { ...productToForm(product), compareAtPrice: '' }
		expect(formToPayload(form, { isNew: true })).not.toHaveProperty('compareAtPrice')
		expect(formToPayload(form, { isNew: false }).compareAtPrice).toBeNull()
	})

	it('moves items and ignores moves past the ends', () => {
		expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
		expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
		expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
	})

	it('builds URL slugs', () => {
		expect(slugify('  Crème Brûlée Shirt — No. 5! ')).toBe('creme-brulee-shirt-no-5')
	})
})
