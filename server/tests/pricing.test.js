import { describe, expect, it } from 'vitest'
import { calculateTotals } from '../src/services/pricing.js'

describe('calculateTotals', () => {
	it('adds shipping below the free shipping threshold', () => {
		expect(calculateTotals([{ price: 19.99, quantity: 2 }])).toEqual({
			subtotal: 39.98,
			shipping: 4.9,
			amount: 44.88,
		})
	})

	it('ships for free from the threshold', () => {
		expect(calculateTotals([{ price: 25, quantity: 2 }])).toEqual({
			subtotal: 50,
			shipping: 0,
			amount: 50,
		})
	})

	it('avoids floating point artifacts', () => {
		expect(calculateTotals([{ price: 0.1, quantity: 3 }]).subtotal).toBe(0.3)
	})
})
