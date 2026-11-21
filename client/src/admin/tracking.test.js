import { describe, expect, it } from 'vitest'
import { trackingBody, trackingToForm } from './tracking'

describe('tracking form helpers', () => {
	it('leaves out an empty link so the server generates it', () => {
		expect(trackingBody({ carrier: 'dpd', number: ' 123 456 ', url: '' })).toEqual({
			carrier: 'dpd',
			number: '123 456',
		})
		expect(trackingToForm()).toEqual({ carrier: 'inpost', number: '', url: '' })
	})

	it('keeps a link the admin typed', () => {
		const previous = { carrier: 'dpd', number: '1', url: 'https://dpd.example/1' }
		expect(
			trackingBody({ ...trackingToForm(previous), url: 'https://my.link/1' }, previous),
		).toEqual({
			carrier: 'dpd',
			number: '1',
			url: 'https://my.link/1',
		})
	})

	it('drops the old generated link when the number changes', () => {
		const previous = { carrier: 'dpd', number: '1', url: 'https://dpd.example/1' }
		expect(trackingBody({ ...trackingToForm(previous), number: '2' }, previous)).toEqual({
			carrier: 'dpd',
			number: '2',
		})
	})
})
