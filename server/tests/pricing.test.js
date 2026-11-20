import { describe, expect, it } from 'vitest'
import { calculateTotals } from '../src/services/pricing.js'

const items = (price, quantity = 1) => [{ price, quantity }]

describe('calculateTotals', () => {
	it('adds standard shipping below the free shipping threshold', () => {
		expect(calculateTotals(items(19.99, 2))).toMatchObject({
			subtotal: 39.98,
			discount: 0,
			shipping: 4.9,
			amount: 44.88,
			shippingMethod: { id: 'standard', label: 'Standard delivery', price: 4.9 },
		})
	})

	it('ships for free from the threshold, but not with express delivery', () => {
		expect(calculateTotals(items(25, 2)).shipping).toBe(0)
		expect(calculateTotals(items(25, 2), { shippingMethod: 'express' }).shipping).toBe(9.9)
	})

	it('applies percentage and fixed discounts before checking free shipping', () => {
		const percent = calculateTotals(items(60), {
			promo: { code: 'TEN', type: 'percent', value: 10 },
		})
		// 60 - 6 = 54 is still above the threshold
		expect(percent).toMatchObject({ discount: 6, shipping: 0, amount: 54, promoCode: 'TEN' })

		const fixed = calculateTotals(items(55), { promo: { code: 'FIVE', type: 'fixed', value: 10 } })
		// 55 - 10 = 45 falls below the threshold, so shipping is charged
		expect(fixed).toMatchObject({ discount: 10, shipping: 4.9, amount: 49.9 })
	})

	it('never discounts more than the subtotal and supports free shipping codes', () => {
		expect(calculateTotals(items(8), { promo: { type: 'fixed', value: 20 } }).discount).toBe(8)
		expect(
			calculateTotals(items(10), { shippingMethod: 'express', promo: { type: 'free_shipping' } })
				.shipping,
		).toBe(0)
	})

	it('avoids floating point artifacts', () => {
		expect(calculateTotals([{ price: 0.1, quantity: 3 }]).subtotal).toBe(0.3)
	})
})
