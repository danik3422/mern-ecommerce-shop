import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../../auth/AuthProvider'
import { CartProvider } from '../../cart/CartProvider'
import QuickAdd from './QuickAdd'
import { makeProduct } from '../../test/fixtures'

const tee = makeProduct({
	_id: 'p1',
	slug: 'tee',
	title: 'Tee',
	colors: ['white'],
	sizes: [
		{ label: 'S', stock: 0 },
		{ label: 'M', stock: 3 },
	],
})

const renderQuickAdd = (product) =>
	render(
		<AuthProvider>
			<CartProvider>
				<MemoryRouter>
					<QuickAdd product={product} />
				</MemoryRouter>
			</CartProvider>
		</AuthProvider>,
	)

const savedCart = () => JSON.parse(localStorage.getItem('cart'))

describe('QuickAdd', () => {
	beforeEach(() => localStorage.clear())

	it('adds the chosen size to the bag in one click', () => {
		renderQuickAdd(tee)
		fireEvent.click(screen.getByRole('button', { name: 'Add Tee in size M' }))
		expect(savedCart()).toEqual([{ productId: 'p1', size: 'M', color: 'white', quantity: 1 }])
	})

	it('stops at the stock: a size whose whole stock is in the bag cannot be added again', () => {
		renderQuickAdd(tee)
		for (let click = 0; click < 3; click++) {
			fireEvent.click(screen.getByRole('button', { name: 'Add Tee in size M' }))
		}
		expect(savedCart()[0].quantity).toBe(3)
		expect(
			screen.getByRole('button', { name: 'M, all available items are in your bag' }),
		).toBeDisabled()
	})

	it('disables sold-out sizes', () => {
		renderQuickAdd(tee)
		expect(screen.getByRole('button', { name: 'S, sold out' })).toBeDisabled()
	})

	it('sends products with several colors to the product page', () => {
		renderQuickAdd(
			makeProduct({ ...tee, variants: undefined, colors: ['white', 'black'], slug: 'tee' }),
		)
		expect(screen.getByRole('link', { name: 'Choose color & size' })).toHaveAttribute(
			'href',
			'/product/tee',
		)
		expect(screen.queryByRole('button', { name: /in size/ })).not.toBeInTheDocument()
	})

	it('adds one-size products directly and hides itself for sold-out products', () => {
		const { unmount } = renderQuickAdd(
			makeProduct({
				slug: 'tee',
				title: 'Tee',
				colors: ['white'],
				sizes: [{ label: 'One size', stock: 2 }],
			}),
		)
		fireEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
		expect(savedCart()[0].size).toBe('One size')
		unmount()

		renderQuickAdd(makeProduct({ title: 'Tee', sizes: [{ label: 'M', stock: 0 }] }))
		expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument()
	})
})
