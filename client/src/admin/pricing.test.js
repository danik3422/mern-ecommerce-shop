import { describe, expect, it } from 'vitest'
import { discountPercent, previewDiscount, priceErrors } from './pricing'

describe('admin pricing helpers', () => {
	it('computes the discount of a sale', () => {
		expect(discountPercent('75', '100')).toBe(25)
		expect(discountPercent('100', '')).toBe(0)
		expect(discountPercent('100', '90')).toBe(0)
	})

	it('checks prices like the API does', () => {
		expect(priceErrors('10', '')).toEqual({})
		expect(priceErrors('', '')).toHaveProperty('price')
		expect(priceErrors('-1', '')).toHaveProperty('price')
		expect(priceErrors('10', '10')).toHaveProperty('compareAtPrice')
		expect(priceErrors('10', '12')).toEqual({})
	})

	it('previews a bulk discount from the regular price', () => {
		expect(previewDiscount({ price: 100 }, 20)).toEqual({ price: 80, compareAtPrice: 100 })
		expect(previewDiscount({ price: 80, compareAtPrice: 100 }, 50)).toEqual({
			price: 50,
			compareAtPrice: 100,
		})
		expect(previewDiscount({ price: 80, compareAtPrice: 100 }, 0)).toEqual({
			price: 100,
			compareAtPrice: null,
		})
	})
})
