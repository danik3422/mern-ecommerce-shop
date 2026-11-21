import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { AuthContext } from '../auth/AuthContext'
import { ConfirmProvider } from '../components/ui/confirm/ConfirmProvider'
import { ToastProvider } from '../components/ui/toast/ToastProvider'

export const OWNER = {
	_id: 'owner1',
	username: 'boss',
	isAdmin: true,
	role: 'staff',
	isOwner: true,
	permissions: [],
}

/**
 * Renders an admin page with the providers it needs (queries, auth, toasts, confirm popups).
 * The current path is printed in `data-testid="path"`.
 * @param route the route pattern, e.g. '/admin/products/:id'
 */
export const renderAdmin = (page, { path = '/admin', route = path, user = OWNER } = {}) => {
	const CurrentPath = () => <p data-testid='path'>{useLocation().pathname}</p>
	const auth = { user, login() {}, register() {}, logout() {}, updateUser() {} }
	return render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthContext.Provider value={auth}>
				<MemoryRouter initialEntries={[path]}>
					<ToastProvider>
						<ConfirmProvider>
							<Routes>
								<Route path={route} element={page} />
								<Route path='*' element={null} />
							</Routes>
							<CurrentPath />
						</ConfirmProvider>
					</ToastProvider>
				</MemoryRouter>
			</AuthContext.Provider>
		</QueryClientProvider>,
	)
}
