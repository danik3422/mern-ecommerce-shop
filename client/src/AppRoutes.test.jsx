import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as productsApi from './api/products'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'

vi.mock('./api/products', async (importOriginal) => ({
	...(await importOriginal()),
	fetchProducts: vi.fn(),
	fetchProduct: vi.fn(),
}))

const coat = {
	_id: 'p1',
	title: 'Arrow Jacket',
	description: 'Warm jacket',
	img: 'https://example.com/coat.png',
	categories: ['coats'],
	color: ['green'],
	size: ['M', 'L'],
	price: 120,
	inStock: true,
}

const renderAt = (path) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthProvider>
				<CartProvider>
					<MemoryRouter initialEntries={[path]}>
						<AppRoutes />
					</MemoryRouter>
				</CartProvider>
			</AuthProvider>
		</QueryClientProvider>,
	)

/** Every page must render with the shared layout — guards against blank screens. */
describe('routes', () => {
	beforeEach(() => {
		localStorage.clear()
		vi.mocked(productsApi.fetchProducts).mockResolvedValue({
			items: [coat],
			page: 1,
			pages: 1,
			total: 1,
		})
		vi.mocked(productsApi.fetchProduct).mockResolvedValue(coat)
	})

	it.each([
		['/', /quiet essentials/i],
		['/products', /all products/i],
		['/products/coats', /coats/i],
		['/product/p1', /arrow jacket/i],
		['/cart', /your bag is empty/i],
		['/login', /sign in/i],
		['/register', /create an account/i],
		['/does-not-exist', /page not found/i],
	])('%s renders', async (path, heading) => {
		renderAt(path)

		expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
		expect(screen.getByRole('banner')).toBeInTheDocument()
		expect(screen.getByRole('contentinfo')).toBeInTheDocument()
	})

	it('shows products from the API in the catalog', async () => {
		renderAt('/products')
		expect(await screen.findByRole('link', { name: /arrow jacket/i })).toHaveAttribute(
			'href',
			'/product/p1',
		)
	})

	it('adds the chosen options to the bag on the product page', async () => {
		renderAt('/product/p1')
		;(await screen.findByLabelText('L')).click()
		screen.getByRole('button', { name: 'Add to bag' }).click()

		expect(await screen.findByText(/added to your bag/i)).toBeInTheDocument()
		expect(JSON.parse(localStorage.getItem('cart'))).toEqual([
			{ productId: 'p1', color: 'green', size: 'L', quantity: 1 },
		])
		expect(screen.getByRole('link', { name: 'Bag, 1 item' })).toBeInTheDocument()
	})
})
