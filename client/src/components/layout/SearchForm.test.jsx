import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as productsApi from '../../api/products'
import SearchForm from './SearchForm'
import { formatMoney } from '../../utils/money'

vi.mock('../../api/products', async (importOriginal) => ({
	...(await importOriginal()),
	fetchSearchSuggestions: vi.fn(),
}))

const tee = {
	_id: 'p1',
	slug: 'trail-print-tee',
	brand: 'Kiiki',
	title: 'Trail Print Tee',
	price: 24,
	images: ['/tee.jpg'],
}

const Location = () => {
	const location = useLocation()
	return <output aria-label='location'>{location.pathname + location.search}</output>
}

const renderSearch = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<MemoryRouter>
				<SearchForm />
				<Routes>
					<Route path='*' element={<Location />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>,
	)

const input = () => screen.getByRole('combobox', { name: 'Search products and brands' })
const location = () => screen.getByLabelText('location')

describe('SearchForm', () => {
	beforeEach(() => {
		localStorage.clear()
		// the server matches brands and categories, typos included
		vi.mocked(productsApi.fetchSearchSuggestions).mockImplementation(async (q) => ({
			products: [tee],
			total: 7,
			brands: ['ki', 'kikki'].includes(q) ? [{ value: 'Kiiki', count: 2 }] : [],
			categories: q === 'kikki' ? ['tshirts'] : [],
			correctedQuery: q === 'kikki' ? 'kiiki' : null,
		}))
	})

	it('suggests matching brands and products while typing', async () => {
		renderSearch()
		fireEvent.change(input(), { target: { value: 'ki' } })

		expect(
			await screen.findByRole('option', { name: `Kiiki Trail Print Tee, ${formatMoney(24)}` }),
		).toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'Brand Kiiki, 2 items' })).toBeInTheDocument()
		expect(screen.queryByRole('option', { name: /Maris/ })).not.toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'Search for “ki”, 7 results' })).toBeInTheDocument()
		expect(screen.queryByText(/Showing matches/)).not.toBeInTheDocument()
	})

	it('says when suggestions are for a corrected spelling and offers matching categories', async () => {
		renderSearch()
		fireEvent.change(input(), { target: { value: 'kikki' } })

		expect(await screen.findByText('Showing matches for “kiiki”')).toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'Brand Kiiki, 2 items' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('option', { name: 'Category T-shirts' }))
		expect(location()).toHaveTextContent('/products/tshirts')
	})

	it('moves through suggestions with the keyboard and opens the chosen product', async () => {
		renderSearch()
		fireEvent.change(input(), { target: { value: 'trail' } })
		await screen.findByRole('option', { name: /Trail Print Tee/ })

		// no brand matches "trail": the product is the first option
		fireEvent.keyDown(input(), { key: 'ArrowDown' })
		expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id)
		fireEvent.submit(input())

		expect(location()).toHaveTextContent('/product/trail-print-tee')
	})

	it('searches for the typed text and remembers it as a recent search', async () => {
		renderSearch()
		fireEvent.change(input(), { target: { value: 'linen' } })
		fireEvent.submit(input())
		expect(location()).toHaveTextContent('/products?q=linen')

		fireEvent.change(input(), { target: { value: '' } })
		fireEvent.focus(input())
		expect(screen.getByRole('option', { name: 'linen' })).toBeInTheDocument()
	})
})
