import { afterEach, describe, expect, it, vi } from 'vitest'
import { reserveStock } from '../src/services/stock.js'
import { createProduct, stockOf } from './helpers.js'

const line = (product, overrides = {}) => ({
	productId: product.id,
	color: 'black',
	size: 'M',
	quantity: 1,
	product,
	...overrides,
})

describe('reserveStock', () => {
	afterEach(() => vi.useRealTimers())

	// Regression: Mongoose adds `updatedAt` to every update. When the stock condition lived
	// only in arrayFilters, a sold-out size still counted as "modified" whenever the clock had
	// moved on, and the last item could be sold twice.
	it('never takes more than is left, even when updates happen at different times', async () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		const product = await createProduct({ sizes: [{ label: 'M', stock: 1 }] })

		vi.setSystemTime(new Date('2030-01-01T10:00:00Z'))
		await reserveStock([line(product)])

		vi.setSystemTime(new Date('2030-01-01T10:00:05Z'))
		await expect(reserveStock([line(product)])).rejects.toMatchObject({ status: 409 })

		expect(await stockOf(product.id, 'black', 'M')).toBe(0)
	})

	it('takes stock only from the chosen color', async () => {
		const product = await createProduct({ sizes: [{ label: 'M', stock: 2 }] })
		await reserveStock([line(product, { color: 'white', quantity: 2 })])

		expect(await stockOf(product.id, 'white', 'M')).toBe(0)
		expect(await stockOf(product.id, 'black', 'M')).toBe(2)
	})
})
