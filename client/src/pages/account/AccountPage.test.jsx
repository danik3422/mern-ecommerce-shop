import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../../api/account'
import * as ordersApi from '../../api/orders'
import { renderWithProviders } from '../../components/account/test-utils'
import RequireAuth from '../../auth/RequireAuth'
import AccountPage from './AccountPage'
import { restoreSessionAs } from '../../test/session'

// AuthProvider restores this session from the (faked) refresh cookie when it mounts
restoreSessionAs({ _id: 'u1', username: 'alice', email: 'alice@example.com', isAdmin: false })
vi.mock('../../api/account', async (importOriginal) => ({
	...(await importOriginal()),
	fetchMyOrders: vi.fn(),
	fetchAddresses: vi.fn(),
	fetchWishlist: vi.fn(),
	fetchWishlistIds: vi.fn(),
	updateProfile: vi.fn(),
}))
vi.mock('../../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	payOrder: vi.fn(),
	cancelOrder: vi.fn(),
}))

const pendingOrder = {
	_id: '6aff5a65e7f068aa10d89f53',
	status: 'pending',
	createdAt: '2026-11-19T10:00:00.000Z',
	items: [
		{
			productId: 'p1',
			title: 'Classic Jeans',
			brand: 'Indigo Works',
			image: '/images/products/classic-jeans.jpg',
			price: 79,
			quantity: 1,
			size: '32',
			color: 'blue',
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
}

// as in AppRoutes: RequireAuth waits until the session is restored
const renderAccount = (path) =>
	renderWithProviders(
		<RequireAuth>
			<AccountPage />
		</RequireAuth>,
		{ path, route: '/account/*' },
	)

describe('AccountPage', () => {
	beforeEach(() => {
		vi.mocked(accountApi.fetchMyOrders).mockResolvedValue([pendingOrder])
		vi.mocked(accountApi.fetchAddresses).mockResolvedValue([
			{ _id: 'a1', ...pendingOrder.address, isDefault: true },
		])
		vi.mocked(accountApi.fetchWishlist).mockResolvedValue([])
		vi.mocked(accountApi.fetchWishlistIds).mockResolvedValue([])
	})

	it.each([
		['/account', 'Orders'],
		['/account/wishlist', 'Wishlist'],
		['/account/addresses', 'Addresses'],
		['/account/profile', 'Profile'],
	])('%s shows the %s section', async (path, title) => {
		renderAccount(path)
		expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: title })).toHaveAttribute('aria-current', 'page')
	})

	it('navigates between sections and redirects unknown ones to orders', async () => {
		renderAccount('/account/unknown')
		expect(await screen.findByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('link', { name: 'Addresses' }))
		expect(await screen.findByText('Alice Smith')).toBeInTheDocument()
		expect(screen.getByText('Default')).toBeInTheDocument()
	})

	it('shows order details and starts payment for a pending order', async () => {
		vi.mocked(ordersApi.payOrder).mockResolvedValue({ checkoutUrl: null })
		renderAccount('/account')

		expect(await screen.findByText('Order #10D89F53')).toBeInTheDocument()
		expect(screen.getByText('Awaiting payment')).toBeInTheDocument()

		const toggle = screen.getByRole('button', { name: 'Details' })
		fireEvent.click(toggle)
		expect(toggle).toHaveAttribute('aria-expanded', 'true')
		expect(screen.getByText('Shipping address')).toBeVisible()

		fireEvent.click(screen.getByRole('button', { name: 'Pay now' }))
		await waitFor(() => expect(ordersApi.payOrder).toHaveBeenCalledWith(pendingOrder._id))
		expect(await screen.findByText(/online payment is not available/i)).toBeInTheDocument()
	})

	it('asks for the current password before changing the email', async () => {
		vi.mocked(accountApi.updateProfile).mockResolvedValue({
			_id: 'u1',
			username: 'alice',
			email: 'new@example.com',
		})
		renderAccount('/account/profile')

		const email = await screen.findByLabelText('Email')
		fireEvent.change(email, { target: { value: 'new@example.com' } })
		const current = screen.getByLabelText('Current password')
		fireEvent.change(current, { target: { value: 'password123' } })
		fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

		await waitFor(() =>
			expect(accountApi.updateProfile).toHaveBeenCalledWith({
				email: 'new@example.com',
				currentPassword: 'password123',
			}),
		)
		expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument()
	})
})
