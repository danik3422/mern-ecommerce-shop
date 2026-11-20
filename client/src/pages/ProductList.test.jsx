import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as productsApi from '../api/products'
import { AuthProvider } from '../auth/AuthProvider'
import { CartProvider } from '../cart/CartProvider'
import ProductList from './ProductList'

vi.mock('../api/products', async (importOriginal) => ({
	...(await importOriginal()),
	fetchProducts: vi.fn(),
	fetchFacets: vi.fn(),
}))

const product = {
	_id: 'p1',
	slug: 'wool-coat',
	title: 'Wool Coat',
	brand: 'Aster & Co',
	images: ['/coat.jpg'],
	categories: ['coats'],
	colors: ['black'],
	sizes: [{ label: 'M', stock: 2 }],
	price: 150,
	inStock: true,
	onSale: false,
	discountPercent: 0,
	rating: { average: 0, count: 0 },
}

const facets = {
	brands: [
		{ value: 'Aster & Co', count: 3 },
		{ value: 'Northline', count: 1 },
	],
	colors: [{ value: 'black', count: 2 }],
	sizes: [
		{ value: 'S', count: 1 },
		{ value: 'M', count: 3 },
	],
	price: { min: 20, max: 200 },
}

/** Renders the current URL so tests can assert on the filter state kept in it. */
const LocationProbe = () => {
	const location = useLocation()
	return <output aria-label='current url'>{location.pathname + location.search}</output>
}

const renderAt = (url) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthProvider>
				<CartProvider>
					<MemoryRouter initialEntries={[url]}>
						<Routes>
							<Route path='/products' element={<ProductList />} />
							<Route path='/products/:category' element={<ProductList />} />
						</Routes>
						<LocationProbe />
					</MemoryRouter>
				</CartProvider>
			</AuthProvider>
		</QueryClientProvider>,
	)

const currentUrl = () => screen.getByLabelText('current url').textContent
const lastApiQuery = () => vi.mocked(productsApi.fetchProducts).mock.lastCall[0]
const sidebar = () => screen.getByRole('complementary', { name: 'Filters' })

describe('ProductList', () => {
	beforeEach(() => {
		vi.mocked(productsApi.fetchProducts).mockResolvedValue({
			items: [product],
			page: 1,
			pages: 1,
			total: 1,
		})
		vi.mocked(productsApi.fetchFacets).mockResolvedValue(facets)
	})

	it('loads products for the category with filters from the URL', async () => {
		renderAt('/products/coats?brand=Northline&size=M,S&inStock=true&sort=price_asc')

		expect(await screen.findByRole('heading', { level: 1, name: 'Coats & jackets' })).toBeVisible()
		expect(await screen.findByText('1 product')).toBeInTheDocument()
		expect(lastApiQuery()).toEqual({
			category: 'coats',
			brand: 'Northline',
			size: 'M,S',
			inStock: 'true',
			sort: 'price_asc',
			page: 1,
			limit: 24,
		})
		expect(productsApi.fetchFacets.mock.lastCall[0]).toEqual({ category: 'coats' })

		const chips = screen.getByRole('list', { name: 'Active filters' })
		expect(
			within(chips)
				.getAllByRole('button')
				.map((b) => b.textContent.trim()),
		).toEqual(['Northline', 'Size M', 'Size S', 'In stock'])
	})

	it('writes checkbox filters to the URL and shows a chip that removes them', async () => {
		renderAt('/products/coats?page=2')

		fireEvent.click(await within(sidebar()).findByRole('checkbox', { name: /Aster & Co/ }))
		expect(currentUrl()).toBe('/products/coats?brand=Aster+%26+Co')

		fireEvent.click(screen.getByRole('button', { name: 'Remove filter Aster & Co' }))
		expect(currentUrl()).toBe('/products/coats')
	})

	it('applies a price range and clears all filters but keeps the search', async () => {
		renderAt('/products?q=coat&onSale=true')

		expect(
			await screen.findByRole('heading', { level: 1, name: 'Results for “coat”' }),
		).toBeVisible()

		fireEvent.change(within(sidebar()).getByLabelText('Min'), { target: { value: '30' } })
		fireEvent.change(within(sidebar()).getByLabelText('Max'), { target: { value: '90' } })
		fireEvent.click(within(sidebar()).getByRole('button', { name: 'Apply price' }))
		expect(currentUrl()).toBe('/products?q=coat&onSale=true&minPrice=30&maxPrice=90')

		fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
		expect(currentUrl()).toBe('/products?q=coat')
	})

	it('changes the sort order', async () => {
		renderAt('/products')
		fireEvent.change(await screen.findByLabelText('Sort by'), { target: { value: 'rating' } })
		expect(currentUrl()).toBe('/products?sort=rating')
	})

	it('treats /products/sale as discounted products of all categories', async () => {
		renderAt('/products/sale')

		expect(await screen.findByRole('heading', { level: 1, name: 'Sale' })).toBeVisible()
		expect(lastApiQuery()).toMatchObject({ onSale: 'true' })
		expect(lastApiQuery()).not.toHaveProperty('category')
		expect(within(sidebar()).queryByRole('checkbox', { name: 'On sale' })).not.toBeInTheDocument()
	})

	it('opens the filter drawer and closes it with Escape', async () => {
		renderAt('/products')

		fireEvent.click(await screen.findByRole('button', { name: /^Filters/ }))
		const drawer = screen.getByRole('dialog', { name: 'Filters' })
		expect(within(drawer).getByRole('button', { name: 'Close filters' })).toHaveFocus()

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('offers to clear filters when nothing matches', async () => {
		vi.mocked(productsApi.fetchProducts).mockResolvedValue({
			items: [],
			page: 1,
			pages: 0,
			total: 0,
		})
		renderAt('/products?color=black')

		fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }))
		expect(currentUrl()).toBe('/products')
	})
})
