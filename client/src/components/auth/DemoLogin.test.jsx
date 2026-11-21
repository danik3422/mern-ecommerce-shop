import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import * as shopApi from '../../api/shop'
import { AuthProvider } from '../../auth/AuthProvider'
import DemoLogin from './DemoLogin'

vi.mock('../../api/shop', async (importOriginal) => ({
	...(await importOriginal()),
	fetchShopConfig: vi.fn(),
}))
vi.mock('../../api/auth', async (importOriginal) => ({
	...(await importOriginal()),
	loginAsDemo: vi.fn(),
}))

const renderDemo = () =>
	render(
		<QueryClientProvider client={new QueryClient()}>
			<AuthProvider>
				<MemoryRouter initialEntries={['/login']}>
					<Routes>
						<Route path='/login' element={<DemoLogin redirectTo='/account' />} />
						<Route path='/admin' element={<h1>Admin panel</h1>} />
						<Route path='/account' element={<h1>My account</h1>} />
					</Routes>
				</MemoryRouter>
			</AuthProvider>
		</QueryClientProvider>,
	)

const session = (username) => ({
	user: { _id: 'u1', username },
	accessToken: 'token',
	expiresIn: 900,
})

describe('DemoLogin', () => {
	beforeEach(() => localStorage.clear())

	it('is hidden when the shop does not run in demo mode', async () => {
		vi.mocked(shopApi.fetchShopConfig).mockResolvedValue({ currency: 'PLN' })
		renderDemo()
		await vi.waitFor(() => expect(shopApi.fetchShopConfig).toHaveBeenCalled())
		expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument()
	})

	it('signs in to the demo admin account and opens the admin panel', async () => {
		vi.mocked(shopApi.fetchShopConfig).mockResolvedValue({ demo: { enabled: true } })
		vi.mocked(authApi.loginAsDemo).mockResolvedValue(session('demo-admin'))
		renderDemo()

		fireEvent.click(await screen.findByRole('button', { name: /demo admin/i }))
		expect(await screen.findByRole('heading', { name: 'Admin panel' })).toBeInTheDocument()
		expect(authApi.loginAsDemo).toHaveBeenCalledWith('admin')
		// the token stays in memory: only a non-secret "signed in" hint is stored
		expect(localStorage.getItem('signedIn')).toBe('true')
		expect(JSON.stringify({ ...localStorage })).not.toContain('token')
	})

	it('sends the demo customer back to the page they came from', async () => {
		vi.mocked(shopApi.fetchShopConfig).mockResolvedValue({ demo: { enabled: true } })
		vi.mocked(authApi.loginAsDemo).mockResolvedValue(session('demo'))
		renderDemo()

		fireEvent.click(await screen.findByRole('button', { name: /demo customer/i }))
		expect(await screen.findByRole('heading', { name: 'My account' })).toBeInTheDocument()
		expect(authApi.loginAsDemo).toHaveBeenCalledWith('customer')
	})
})
