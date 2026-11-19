import { describe, expect, it } from 'vitest'
import { calculateTotals } from './pricing'

describe('calculateTotals', () => {
	it('charges shipping below the threshold and ships for free from it', () => {
		expect(calculateTotals([{ price: 20, quantity: 1 }])).toEqual({
			subtotal: 20,
			shipping: 4.9,
			total: 24.9,
		})
		expect(calculateTotals([{ price: 25, quantity: 2 }]).shipping).toBe(0)
	})

	it('does not charge shipping for an empty cart', () => {
		expect(calculateTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0 })
	})
})
