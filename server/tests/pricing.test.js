import { describe, expect, it } from 'vitest'
import { calculateTotals as calculate } from '../src/services/pricing.js'
import { defaultSettings, price, roundMoney } from './pricingHelpers.js'

const settings = defaultSettings()
const calculateTotals = (items, options) => calculate(items, settings, options)

const items = (unitPrice, quantity = 1) => [{ price: unitPrice, quantity }]
const threshold = settings.freeShippingFrom
const below = roundMoney(threshold - 10)

describe('calculateTotals', () => {
	it('adds standard shipping below the free shipping threshold', () => {
		expect(calculateTotals(items(below))).toMatchObject({
			subtotal: below,
			discount: 0,
			shipping: price('standard'),
			amount: roundMoney(below + price('standard')),
			shippingMethod: { id: 'standard', label: 'Standard delivery', price: price('standard') },
		})
	})

	it('ships for free from the threshold, but not with express delivery', () => {
		expect(calculateTotals(items(threshold)).shipping).toBe(0)
		expect(calculateTotals(items(threshold), { shippingMethod: 'express' }).shipping).toBe(
			price('express'),
		)
	})

	it('applies percentage and fixed discounts before checking free shipping', () => {
		const subtotal = threshold + 20
		const percent = calculateTotals(items(subtotal), {
			promo: { code: 'FIVE', type: 'percent', value: 5 },
		})
		const percentDiscount = roundMoney(subtotal * 0.05)
		expect(percent).toMatchObject({ discount: percentDiscount, promoCode: 'FIVE' })
		// still at or above the threshold after the discount?
		expect(percent.shipping).toBe(subtotal - percentDiscount >= threshold ? 0 : price('standard'))

		const fixed = calculateTotals(items(subtotal), { promo: { type: 'fixed', value: 30 } })
		// subtotal - 30 falls below the threshold, so shipping is charged
		expect(fixed).toMatchObject({
			discount: 30,
			shipping: price('standard'),
			amount: roundMoney(subtotal - 30 + price('standard')),
		})
	})

	it('never discounts more than the subtotal and supports free shipping codes', () => {
		expect(calculateTotals(items(8), { promo: { type: 'fixed', value: 20 } }).discount).toBe(8)
		expect(
			calculateTotals(items(10), { shippingMethod: 'express', promo: { type: 'free_shipping' } })
				.shipping,
		).toBe(0)
	})

	it('never ships for free without a threshold and rejects disabled methods', () => {
		const noFreeShipping = { ...settings, freeShippingFrom: null }
		expect(calculate(items(10_000), noFreeShipping).shipping).toBe(price('standard'))

		const lockerOff = defaultSettings()
		lockerOff.shippingMethods[1].enabled = false
		expect(() => calculate(items(10), lockerOff, { shippingMethod: 'locker' })).toThrow(
			'not available',
		)
	})

	it('avoids floating point artifacts', () => {
		expect(calculateTotals([{ price: 0.1, quantity: 3 }]).subtotal).toBe(0.3)
	})
})
