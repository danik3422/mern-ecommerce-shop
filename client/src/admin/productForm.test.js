import { describe, expect, it } from 'vitest'
import { slugify } from './format'
import {
	emptyProductForm,
	formToPayload,
	isMissingPolish,
	moveItem,
	newVariant,
	productToForm,
	validateProductForm,
	variantErrors,
} from './productForm'

const product = {
	title: 'Coat',
	slug: 'coat',
	brand: 'Aster',
	description: { en: 'Warm', pl: 'Ciepły' },
	price: 80,
	compareAtPrice: 100,
	categories: ['coats'],
	variants: [
		{ color: 'black', images: ['/images/coat.jpg'], sizes: [{ label: 'M', stock: 3 }] },
		{ color: 'camel', images: ['/images/coat-camel.jpg'], sizes: [{ label: 'M', stock: 0 }] },
	],
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
			variants: [{ key: 'v', color: ' White ', images: [], sizes: [{ label: ' S ', stock: '' }] }],
		}
		expect(formToPayload(form, { isNew: true })).toMatchObject({
			title: 'Tee',
			price: 19.5,
			variants: [{ color: 'white', images: [], sizes: [{ label: 'S', stock: 0 }] }],
		})
	})

	it('reads descriptions saved as a plain string as English', () => {
		const form = productToForm({ ...product, description: 'Warm' })
		expect(form.description).toEqual({ en: 'Warm', pl: '' })
		expect(isMissingPolish(form)).toBe(true)
		expect(isMissingPolish(productToForm(product))).toBe(false)
	})

	it('requires the English description and limits both languages', () => {
		const form = productToForm(product)
		expect(validateProductForm({ ...form, description: { en: ' ', pl: 'Ciepły' } })).toEqual({
			'description.en': 'Enter the English description',
		})
		expect(
			validateProductForm({ ...form, description: { en: 'Warm', pl: 'x'.repeat(4001) } }),
		).toHaveProperty('description.pl')
		expect(validateProductForm({ ...form, description: { en: 'Warm', pl: '' } })).toEqual({})
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

	it('starts a new color with the size labels of the first one and no stock', () => {
		const [first] = productToForm(product).variants
		expect(newVariant(first)).toMatchObject({
			color: '',
			images: [],
			sizes: [{ label: 'M', stock: '0' }],
		})
	})

	it('picks the field errors of one variant', () => {
		const errors = {
			title: 'Required',
			'variants.1.sizes.0.stock': 'Too small',
			'variants.10.color': 'x',
		}
		expect(variantErrors(errors, 1)).toEqual({ 'sizes.0.stock': 'Too small' })
	})

	it('builds URL slugs', () => {
		expect(slugify('  Crème Brûlée Shirt — No. 5! ')).toBe('creme-brulee-shirt-no-5')
	})
})
