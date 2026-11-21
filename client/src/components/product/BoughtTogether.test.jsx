import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as productsApi from '../../api/products'
import { AuthProvider } from '../../auth/AuthProvider'
import { CartProvider } from '../../cart/CartProvider'
import { makeProduct } from '../../test/fixtures'
import { ToastProvider } from '../ui/toast/ToastProvider'
import BoughtTogether from './BoughtTogether'

vi.mock('../../api/products', async (importOriginal) => ({
	...(await importOriginal()),
	fetchBoughtTogether: vi.fn(),
}))

const coat = makeProduct({ _id: 'coat', title: 'Wool Coat', colors: ['black'], price: 300 })
const scarf = makeProduct({
	_id: 'scarf',
	slug: 'scarf',
	title: 'Knit Scarf',
	brand: 'Velo',
	colors: ['gray'],
	sizes: [
		{ label: 'S', stock: 1 },
		{ label: 'M', stock: 4 },
	],
	price: 60,
})
const cap = makeProduct({
	_id: 'cap',
	slug: 'cap',
	title: 'Cap',
	colors: ['blue'],
	sizes: [{ label: 'One size', stock: 3 }],
	price: 40,
})

const renderBundle = ({ size = 'L' } = {}) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthProvider>
				<CartProvider>
					<MemoryRouter>
						<ToastProvider>
							<BoughtTogether
								product={coat}
								variant={coat.variants[0]}
								size={size}
								available={2}
								sizeStock={2}
							/>
						</ToastProvider>
					</MemoryRouter>
				</CartProvider>
			</AuthProvider>
		</QueryClientProvider>,
	)

const savedCart = () => JSON.parse(localStorage.getItem('cart'))
const addBoth = () => screen.getByRole('button', { name: 'Add both to bag' })

describe('BoughtTogether', () => {
	beforeEach(() => {
		localStorage.clear()
		vi.mocked(productsApi.fetchBoughtTogether).mockResolvedValue({
			source: 'orders',
			items: [
				{ ...scarf, orders: 5 },
				{ ...cap, orders: 2 },
			],
		})
	})

	it('adds the product and the top pick once a size of the pick is chosen', async () => {
		renderBundle()

		expect(
			await screen.findByRole('heading', { name: 'Frequently bought together' }),
		).toBeInTheDocument()
		expect(screen.getByText('Bought together in 5 orders')).toBeInTheDocument()
		expect(addBoth()).toBeDisabled()
		expect(screen.getByText('Choose a size of Knit Scarf.')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('radio', { name: 'M' }))
		expect(addBoth()).toBeEnabled()
		fireEvent.click(addBoth())

		expect(savedCart()).toEqual([
			{ productId: 'coat', color: 'black', size: 'L', quantity: 1 },
			{ productId: 'scarf', color: 'gray', size: 'M', quantity: 1 },
		])
		expect(await screen.findByText('Both items added to your bag')).toBeInTheDocument()
		// the other companion is a regular card
		expect(screen.getByRole('heading', { name: 'Also bought with it' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /Cap/ })).toBeInTheDocument()
	})

	it('asks for the size of the main product first', async () => {
		renderBundle({ size: null })
		expect(await screen.findByText('Choose your size above first.')).toBeInTheDocument()
		expect(addBoth()).toBeDisabled()
	})

	it('stays hidden when the suggestions are only similar products', async () => {
		vi.mocked(productsApi.fetchBoughtTogether).mockResolvedValue({
			source: 'related',
			items: [scarf],
		})
		renderBundle()
		await vi.waitFor(() => expect(productsApi.fetchBoughtTogether).toHaveBeenCalled())
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(screen.queryByRole('heading')).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Add both to bag' })).not.toBeInTheDocument()
	})
})
