import { describe, expect, it } from 'vitest'
import {
	MAX_QUANTITY,
	addLine,
	countItems,
	lineKey,
	mergeLines,
	removeProducts,
	setLineQuantity,
} from './cartLines'

const black = { productId: 'p1', color: 'black', size: 'M', quantity: 1 }
const white = { productId: 'p1', color: 'white', size: 'M', quantity: 2 }

describe('cart lines', () => {
	it('adds a new line or increases the quantity of the same product and options', () => {
		let lines = addLine([], black)
		lines = addLine(lines, { ...black, quantity: 2 })
		lines = addLine(lines, white)
		expect(lines).toEqual([{ ...black, quantity: 3 }, white])
	})

	it('caps the quantity', () => {
		expect(addLine([black], { ...black, quantity: 500 })[0].quantity).toBe(MAX_QUANTITY)
	})

	it('removes a line when its quantity drops to zero', () => {
		const lines = setLineQuantity([black, white], lineKey(black), 0)
		expect(lines).toEqual([white])
		expect(setLineQuantity(lines, lineKey(white), 5)).toEqual([{ ...white, quantity: 5 }])
	})

	it('removes all lines of the given products', () => {
		expect(removeProducts([black, white, { ...black, productId: 'p2' }], ['p1'])).toHaveLength(1)
	})

	it('merges saved and local carts without doubling quantities', () => {
		const merged = mergeLines([{ ...black, quantity: 2 }, white], [black, { ...white, size: 'S' }])
		expect(merged).toEqual([{ ...black, quantity: 2 }, white, { ...white, size: 'S' }])
	})

	it('counts items', () => {
		expect(countItems([black, white])).toBe(3)
	})
})
