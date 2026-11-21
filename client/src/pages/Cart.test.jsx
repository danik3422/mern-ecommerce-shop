import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../api/account'
import * as ordersApi from '../api/orders'
import * as productsApi from '../api/products'
import * as shopApi from '../api/shop'
import { AuthProvider } from '../auth/AuthProvider'
import { CartProvider } from '../cart/CartProvider'
import { makeProduct } from '../test/fixtures'
import Cart from './Cart'
import { money } from '../test/money'
import { restoreSessionAs } from '../test/session'

vi.mock('../api/products', async (importOriginal) => ({
	...(await importOriginal()),
	fetchProducts: vi.fn(),
}))
vi.mock('../api/shop', async (importOriginal) => ({
	...(await importOriginal()),
	fetchShopConfig: vi.fn(),
	fetchQuote: vi.fn(),
}))
vi.mock('../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	createOrder: vi.fn(),
}))
vi.mock('../api/account', async (importOriginal) => ({
	...(await importOriginal()),
	fetchAddresses: vi.fn(),
}))

const coat = makeProduct({ price: 40, colors: ['black'], sizes: [{ label: 'M', stock: 5 }] })
const line = { productId: 'p1', color: 'black', size: 'M', quantity: 1 }

const config = {
	currency: 'USD',
	freeShippingFrom: 50,
	shippingMethods: [
		{ id: 'standard', label: 'Standard delivery', price: 4.9, freeShipping: true, days: [3, 5] },
		{ id: 'express', label: 'Express delivery', price: 9.9, freeShipping: false, days: [1, 2] },
	],
}

/** A tiny fake of the server's quote: 10% off with SAVE10, other codes are unknown. */
const fakeQuote = ({ shippingMethod = 'standard', promoCode }) => {
	if (promoCode && promoCode.toUpperCase() !== 'SAVE10') {
		const error = new Error('Bad request')
		error.response = {
			status: 400,
			data: { details: [{ path: 'promoCode', message: 'This promo code does not exist' }] },
		}
		return Promise.reject(error)
	}
	const method = config.shippingMethods.find((m) => m.id === shippingMethod)
	const discount = promoCode ? 4 : 0
	return Promise.resolve({
		subtotal: 40,
		discount,
		shipping: method.price,
		amount: 40 - discount + method.price,
		shippingMethod: { id: method.id, label: method.label, price: method.price },
		...(promoCode && { promo: { code: 'SAVE10' } }),
	})
}

const renderCart = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthProvider>
				<CartProvider>
					<MemoryRouter>
						<Cart />
					</MemoryRouter>
				</CartProvider>
			</AuthProvider>
		</QueryClientProvider>,
	)

const summary = () => screen.getByRole('complementary', { name: 'Order summary' })

describe('Cart checkout options', () => {
	beforeEach(() => {
		localStorage.clear()
		localStorage.setItem('cart', JSON.stringify([line]))
		// AuthProvider restores this session from the (faked) refresh cookie when it mounts
		restoreSessionAs({ _id: 'u1', username: 'alice' })
		vi.mocked(productsApi.fetchProducts).mockResolvedValue({ items: [coat], total: 1 })
		vi.mocked(shopApi.fetchShopConfig).mockResolvedValue(config)
		vi.mocked(shopApi.fetchQuote).mockImplementation(fakeQuote)
		vi.mocked(accountApi.fetchAddresses).mockRejectedValue(new Error('offline'))
		vi.mocked(ordersApi.createOrder).mockResolvedValue({ order: { _id: 'o1' }, checkoutUrl: null })
	})

	it('updates totals for the delivery method and promo code and orders with both', async () => {
		renderCart()
		await screen.findByRole('complementary', { name: 'Order summary' })
		expect(await within(summary()).findByText(money(44.9))).toBeInTheDocument()

		fireEvent.click(screen.getByRole('radio', { name: /Express delivery/ }))
		expect(await within(summary()).findByText(money(49.9))).toBeInTheDocument()

		const promo = screen.getByLabelText('Promo code')
		fireEvent.change(promo, { target: { value: 'nope' } })
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
		expect(await screen.findByText('This promo code does not exist')).toBeInTheDocument()

		fireEvent.change(promo, { target: { value: 'save10' } })
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
		expect(await screen.findByText(/applied/)).toHaveTextContent('Code SAVE10 applied')
		expect(await within(summary()).findByText(`−${money(4)}`)).toBeInTheDocument()

		// the address book is unavailable here, so the new address form appears
		await screen.findByLabelText('Full name')
		for (const [label, value] of Object.entries({
			'Full name': 'Alice Smith',
			'Street and house number': 'Main 1',
			'Postal code': '00-001',
			City: 'Warsaw',
			Country: 'Poland',
		})) {
			fireEvent.change(screen.getByLabelText(label), { target: { value } })
		}
		fireEvent.click(screen.getByRole('button', { name: /place order/i }))

		await waitFor(() =>
			expect(ordersApi.createOrder).toHaveBeenCalledWith(
				expect.objectContaining({ shippingMethod: 'express', promoCode: 'SAVE10' }),
			),
		)
	})
})
