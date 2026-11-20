import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
	fetchFacets: vi.fn(async () => ({
		brands: [],
		colors: [],
		sizes: [],
		price: { min: 0, max: 0 },
	})),
	fetchRelatedProducts: vi.fn(async () => []),
}))

const coat = {
	_id: 'p1',
	slug: 'arrow-jacket',
	title: 'Arrow Jacket',
	brand: 'Aster',
	description: 'Warm jacket',
	images: ['https://example.com/coat.png'],
	categories: ['coats'],
	colors: ['green'],
	sizes: [
		{ label: 'M', stock: 0 },
		{ label: 'L', stock: 2 },
	],
	price: 120,
	compareAtPrice: 150,
	inStock: true,
	onSale: true,
	discountPercent: 20,
	rating: { average: 0, count: 0 },
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
		['/product/arrow-jacket', /arrow jacket/i],
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
		const card = await screen.findByRole('link', { name: /arrow jacket/i })
		expect(card).toHaveAttribute('href', '/product/arrow-jacket')
		expect(card).toHaveTextContent('−20%')
	})

	it('adds the chosen options to the bag and skips sold-out sizes', async () => {
		renderAt('/product/arrow-jacket')

		const soldOut = await screen.findByRole('radio', { name: 'M, sold out' })
		expect(soldOut).toBeDisabled()
		// the first size with stock is preselected
		expect(screen.getByRole('radio', { name: 'L' })).toBeChecked()
		expect(screen.getByText('Only 2 left in this size')).toBeInTheDocument()

		screen.getByRole('button', { name: 'Add to bag' }).click()

		const miniBag = await screen.findByRole('dialog', { name: 'Added to your bag' })
		expect(within(miniBag).getByRole('link', { name: 'Go to checkout' })).toHaveAttribute(
			'href',
			'/cart',
		)
		expect(JSON.parse(localStorage.getItem('cart'))).toEqual([
			{ productId: 'p1', color: 'green', size: 'L', quantity: 1 },
		])
		expect(screen.getByRole('link', { name: 'Bag, 1 item' })).toBeInTheDocument()
	})

	it('sends guests from account pages to sign in', async () => {
		renderAt('/account')
		expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
	})

	it('shows recently viewed products on the home page', async () => {
		const { unmount } = renderAt('/product/arrow-jacket')
		await screen.findByRole('heading', { level: 1, name: /arrow jacket/i })
		unmount()

		renderAt('/')
		const section = await screen.findByRole('region', { name: 'Recently viewed' })
		expect(await within(section).findByRole('link', { name: /arrow jacket/i })).toBeInTheDocument()
	})

	it('shows the sticky "Add to bag" bar once the main button scrolls away', async () => {
		renderAt('/product/arrow-jacket')
		const addButton = await screen.findByRole('button', { name: 'Add to bag' })
		const bar = screen.getByRole('button', { name: 'Add to bag · L', hidden: true }).parentElement
		expect(bar).not.toBeVisible()

		// jsdom has no layout: pretend the purchase row is now above the viewport
		vi.spyOn(addButton.parentElement, 'getBoundingClientRect').mockReturnValue({ bottom: -10 })
		fireEvent.scroll(window)

		await waitFor(() => expect(bar).toBeVisible())
	})
})
