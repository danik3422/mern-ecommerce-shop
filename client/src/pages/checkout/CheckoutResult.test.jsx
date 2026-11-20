import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ordersApi from '../../api/orders'
import { AuthContext } from '../../auth/AuthContext'
import { redirectToPayment } from '../../cart/redirect'
import CheckoutResult from './CheckoutResult'

vi.mock('../../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	fetchOrder: vi.fn(),
	payOrder: vi.fn(),
	cancelOrder: vi.fn(),
}))
vi.mock('../../cart/redirect', () => ({ redirectToPayment: vi.fn() }))

const makeOrder = (overrides = {}) => ({
	_id: '6a0000000000000000abc123',
	createdAt: '2026-11-20T10:00:00.000Z',
	status: 'pending',
	payment: { provider: 'stripe', sessionId: 'cs_1' },
	items: [
		{
			productId: 'p1',
			title: 'Classic Jeans',
			brand: 'Indigo Works',
			image: '/images/products/classic-jeans.jpg',
			size: '32',
			color: 'blue',
			quantity: 1,
			price: 79,
		},
	],
	subtotal: 79,
	shipping: 0,
	amount: 79,
	address: {
		fullName: 'Alice Smith',
		street: 'Main st. 1',
		city: 'Warsaw',
		postalCode: '00-001',
		country: 'Poland',
	},
	...overrides,
})

const renderResult = ({
	result = 'success',
	path = '/?order=o1',
	user = { username: 'alice' },
} = {}) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthContext.Provider value={{ user }}>
				<MemoryRouter initialEntries={[path]}>
					<CheckoutResult result={result} />
				</MemoryRouter>
			</AuthContext.Provider>
		</QueryClientProvider>,
	)

const heading = (name) => screen.findByRole('heading', { level: 1, name })

describe('CheckoutResult', () => {
	beforeEach(() => vi.clearAllMocks())

	it('confirms a paid order and shows its summary', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ status: 'paid' }))
		renderResult()

		expect(await heading('Thank you for your order')).toBeInTheDocument()
		expect(screen.getByText(/payment was received/i)).toBeInTheDocument()
		expect(screen.getByText('Order #00ABC123')).toBeInTheDocument()
		expect(screen.getByText('Classic Jeans')).toBeInTheDocument()
		expect(screen.getByText(/Warsaw/)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /try payment again/i })).not.toBeInTheDocument()
	})

	it('waits for the payment confirmation of a pending Stripe order', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder())
		renderResult()
		expect(await heading('Confirming your payment…')).toBeInTheDocument()
	})

	it('explains that payment is collected later when online payment is off', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder({ payment: { provider: 'none' } }))
		renderResult()

		expect(await heading('Thank you for your order')).toBeInTheDocument()
		expect(screen.getByText(/collected on delivery/i)).toBeInTheDocument()
	})

	it('offers to pay again after a cancelled payment', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder())
		vi.mocked(ordersApi.payOrder).mockResolvedValue({
			checkoutUrl: 'https://checkout.stripe.com/x',
		})
		renderResult({ result: 'cancel' })

		expect(await heading('Payment was not completed')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Try payment again' }))

		await vi.waitFor(() =>
			expect(redirectToPayment).toHaveBeenCalledWith('https://checkout.stripe.com/x'),
		)
	})

	it('cancels the order on request', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder())
		vi.mocked(ordersApi.cancelOrder).mockResolvedValue(makeOrder({ status: 'cancelled' }))
		renderResult({ result: 'cancel' })

		fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }))

		expect(await heading('This order was cancelled')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
	})

	it('shows an error when the payment cannot be restarted', async () => {
		vi.mocked(ordersApi.fetchOrder).mockResolvedValue(makeOrder())
		vi.mocked(ordersApi.payOrder).mockRejectedValue({
			response: { status: 409, data: { message: 'Online payment is not available' } },
		})
		renderResult({ result: 'cancel' })

		fireEvent.click(await screen.findByRole('button', { name: 'Try payment again' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('Online payment is not available')
	})

	it('handles missing orders, foreign orders and signed-out visitors', async () => {
		renderResult({ path: '/' })
		expect(await heading('Order not found')).toBeInTheDocument()
	})

	it('reports orders that cannot be found', async () => {
		vi.mocked(ordersApi.fetchOrder).mockRejectedValue({ response: { status: 404 } })
		renderResult()
		expect(await heading('Order not found')).toBeInTheDocument()
	})

	it('asks signed-out visitors to sign in', async () => {
		renderResult({ user: null })
		expect(await heading('Sign in to see your order')).toBeInTheDocument()
		expect(ordersApi.fetchOrder).not.toHaveBeenCalled()
	})
})
