import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { money } from '../test/money'

const stats = {
	revenue: 1234.5,
	orders: 3,
	ordersByStatus: { pending: 1, paid: 1, shipped: 0, delivered: 0, cancelled: 1 },
	customers: 7,
	products: { total: 12, active: 11 },
	lowStock: [{ productId: 'p1', title: 'Coat', slug: 'coat', size: 'M', stock: 0 }],
	revenuePerDay: Array.from({ length: 30 }, (_, i) => ({
		date: `2026-10-${String(i + 1).padStart(2, '0')}`,
		total: i === 29 ? 100 : 0,
		orders: i === 29 ? 1 : 0,
	})),
	topProducts: [],
	recentOrders: [],
}

/**
 * AuthProvider restores the session once, when its module loads, so every test
 * stores a session first and then imports a fresh copy of the app.
 */
const renderAdminAs = async (user, path = '/admin') => {
	localStorage.clear()
	if (user) localStorage.setItem('session', JSON.stringify({ user, accessToken: 'token' }))

	vi.resetModules()
	vi.doMock('../api/admin', async (importOriginal) => ({
		...(await importOriginal()),
		fetchAdminStats: vi.fn().mockResolvedValue(stats),
		fetchMe: vi.fn().mockResolvedValue(user),
		fetchAdminCounts: vi
			.fn()
			.mockResolvedValue({ ordersToShip: 2, ordersUnpaid: 0, openReturns: 1 }),
		fetchAdminOrders: vi.fn().mockResolvedValue({ items: [], page: 1, pages: 0, total: 0 }),
	}))
	const { default: AppRoutes } = await import('../AppRoutes')
	const { AuthProvider } = await import('../auth/AuthProvider')
	const { CartProvider } = await import('../cart/CartProvider')

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
}

describe('admin panel access', () => {
	beforeEach(() => vi.doUnmock('../api/admin'))

	it('sends guests to sign in', async () => {
		await renderAdminAs(null)
		expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
	})

	it('sends customers back to the shop', async () => {
		await renderAdminAs({ _id: 'u1', username: 'alice', isAdmin: false })
		expect(
			await screen.findByRole('heading', { level: 1, name: /quiet essentials/i }),
		).toBeInTheDocument()
		expect(screen.queryByRole('navigation', { name: 'Admin' })).not.toBeInTheDocument()
	})

	it('shows the dashboard to admins', async () => {
		await renderAdminAs({
			_id: 'a1',
			username: 'boss',
			isAdmin: true,
			role: 'staff',
			isOwner: true,
			permissions: [],
		})

		expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
		expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument()
		expect(await screen.findByText(money(1234.5))).toBeInTheDocument()
		expect(screen.getByRole('img', { name: /revenue, last 30 days/i })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Coat' })).toHaveAttribute('href', '/admin/products/p1')
		expect(screen.getByText(/Signed in as boss/)).toBeInTheDocument()
		// owners see every section, with counts of what is waiting
		const nav = screen.getByRole('navigation', { name: 'Admin' })
		expect(
			within(nav)
				.getAllByRole('link')
				.map((link) => link.textContent),
		).toEqual([
			'Dashboard',
			'Products',
			expect.stringMatching(/^Orders2/),
			expect.stringMatching(/^Returns1/),
			'Customers',
			'Reviews',
			'Promo codes',
			'Team',
			'Activity',
			'Settings',
		])
	})

	const support = {
		_id: 's1',
		username: 'sam',
		isAdmin: true,
		role: 'staff',
		isOwner: false,
		permissions: ['orders', 'returns', 'customers', 'reviews'],
	}

	it('shows staff only the sections they may use', async () => {
		await renderAdminAs(support)

		// no dashboard permission: the first allowed section opens instead
		expect(await screen.findByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument()
		const nav = screen.getByRole('navigation', { name: 'Admin' })
		const labels = within(nav)
			.getAllByRole('link')
			.map((link) => link.textContent.replace(/\d.*$/, ''))
		expect(labels).toEqual(['Orders', 'Returns', 'Customers', 'Reviews'])
	})

	it('explains a missing permission instead of showing the page', async () => {
		await renderAdminAs(support, '/admin/settings')
		expect(
			await screen.findByRole('heading', { level: 1, name: "You don't have access" }),
		).toBeInTheDocument()
	})
})
