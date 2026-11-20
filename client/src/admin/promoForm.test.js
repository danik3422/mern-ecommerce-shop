import { describe, expect, it } from 'vitest'
import {
	describeDiscount,
	emptyPromoForm,
	formToPromo,
	promoStatus,
	promoToForm,
} from './promoForm'

const money = (n) => `$${n.toFixed(2)}`

describe('promo code form helpers', () => {
	it('sends empty limits as null and includes the whole end day', () => {
		const body = formToPromo({
			...emptyPromoForm(),
			code: ' spring ',
			value: '15',
			endsAt: '2030-06-30',
		})
		expect(body).toMatchObject({
			code: 'spring',
			type: 'percent',
			value: 15,
			minSubtotal: 0,
			startsAt: null,
			maxUses: null,
		})
		expect(new Date(body.endsAt).getHours()).toBe(23)
	})

	it('round-trips a saved code', () => {
		const promo = {
			code: 'FREESHIP',
			description: 'On us',
			type: 'free_shipping',
			value: 0,
			minSubtotal: 30,
			maxUses: 50,
			active: false,
		}
		expect(formToPromo(promoToForm(promo))).toMatchObject({
			...promo,
			startsAt: null,
			endsAt: null,
		})
	})

	it('describes discounts and statuses', () => {
		expect(describeDiscount({ type: 'percent', value: 20 }, money)).toBe('20% off')
		expect(describeDiscount({ type: 'fixed', value: 5 }, money)).toBe('$5.00 off')
		expect(describeDiscount({ type: 'free_shipping' }, money)).toBe('Free shipping')

		const now = new Date('2030-01-15')
		expect(promoStatus({ active: false }, now)).toBe('off')
		expect(promoStatus({ active: true, startsAt: '2030-02-01' }, now)).toBe('scheduled')
		expect(promoStatus({ active: true, endsAt: '2030-01-01' }, now)).toBe('expired')
		expect(promoStatus({ active: true, maxUses: 2, usedCount: 2 }, now)).toBe('used up')
		expect(promoStatus({ active: true }, now)).toBe('active')
	})
})
