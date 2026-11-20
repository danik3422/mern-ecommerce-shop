import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../../auth/AuthProvider'
import { CartProvider } from '../../cart/CartProvider'
import QuickAdd from './QuickAdd'

const tee = {
	_id: 'p1',
	slug: 'tee',
	title: 'Tee',
	colors: ['white'],
	sizes: [
		{ label: 'S', stock: 0 },
		{ label: 'M', stock: 3 },
	],
	inStock: true,
}

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

	it('disables sold-out sizes', () => {
		renderQuickAdd(tee)
		expect(screen.getByRole('button', { name: 'S, sold out' })).toBeDisabled()
	})

	it('sends products with several colors to the product page', () => {
		renderQuickAdd({ ...tee, colors: ['white', 'black'] })
		expect(screen.getByRole('link', { name: 'Choose color & size' })).toHaveAttribute(
			'href',
			'/product/tee',
		)
		expect(screen.queryByRole('button', { name: /in size/ })).not.toBeInTheDocument()
	})

	it('adds one-size products directly and hides itself for sold-out products', () => {
		const { unmount } = renderQuickAdd({ ...tee, sizes: [{ label: 'One size', stock: 2 }] })
		fireEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
		expect(savedCart()[0].size).toBe('One size')
		unmount()

		renderQuickAdd({ ...tee, inStock: false })
		expect(screen.queryByRole('button', { name: /quick add/i })).not.toBeInTheDocument()
	})
})
