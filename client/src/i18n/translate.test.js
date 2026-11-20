import { describe, expect, it } from 'vitest'
import { createTranslator, detectLocale } from './translate'

const catalogs = {
	en: {
		cart: {
			title: 'Bag',
			hello: 'Hi, {name}!',
			items: { one: '{count} item', other: '{count} items' },
		},
		onlyEnglish: 'Fallback',
	},
	pl: {
		cart: {
			title: 'Koszyk',
			items: { one: '{count} produkt', few: '{count} produkty', many: '{count} produktów' },
		},
	},
}

describe('translations', () => {
	it('looks up nested keys and fills in placeholders', () => {
		const t = createTranslator(catalogs, 'en')
		expect(t('cart.title')).toBe('Bag')
		expect(t('cart.hello', { name: 'Ola' })).toBe('Hi, Ola!')
	})

	it('picks Polish plural forms', () => {
		const t = createTranslator(catalogs, 'pl')
		expect([1, 2, 5, 22, 25].map((count) => t('cart.items', { count }))).toEqual([
			'1 produkt',
			'2 produkty',
			'5 produktów',
			'22 produkty',
			'25 produktów',
		])
	})

	it('falls back to English and then to the key', () => {
		const t = createTranslator(catalogs, 'pl')
		expect(t('onlyEnglish')).toBe('Fallback')
		expect(t('nope.missing')).toBe('nope.missing')
	})

	it('detects the locale from the saved choice or the browser', () => {
		expect(detectLocale('pl', ['en-US'])).toBe('pl')
		expect(detectLocale(null, ['pl-PL', 'en'])).toBe('pl')
		expect(detectLocale(null, ['de-DE'])).toBe('en')
		expect(detectLocale('xx', [])).toBe('en')
	})
})
