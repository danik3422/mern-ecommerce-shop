import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../../auth/AuthProvider'
import { CartProvider } from '../../cart/CartProvider'
import { ConfirmProvider } from '../ui/confirm/ConfirmProvider'
import { ToastProvider } from '../ui/toast/ToastProvider'

/** Renders `ui` at `path` with all app providers and a stub sign-in page. */
export const renderWithProviders = (ui, { path = '/', route = '*' } = {}) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthProvider>
				<CartProvider>
					<MemoryRouter initialEntries={[path]}>
						<ToastProvider>
							<ConfirmProvider>
								<Routes>
									<Route path={route} element={ui} />
									<Route path='/login' element={<h1>Sign in page</h1>} />
								</Routes>
							</ConfirmProvider>
						</ToastProvider>
					</MemoryRouter>
				</CartProvider>
			</AuthProvider>
		</QueryClientProvider>,
	)
