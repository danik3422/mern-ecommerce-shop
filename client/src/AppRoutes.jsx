import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/layout/Layout'
import AccountPage from './pages/account/AccountPage'
import Cart from './pages/Cart'
import CheckoutResult from './pages/checkout/CheckoutResult'
import Home from './pages/Home'
import LogIn from './pages/LogIn'
import NotFound from './pages/NotFound'
import Product from './pages/Product'
import ProductList from './pages/ProductList'
import Register from './pages/Register'

// The admin panel is only needed by staff, so it is loaded on demand in its own chunk
const AdminApp = lazy(() => import('./admin/AdminApp'))

const AppRoutes = () => (
	<Routes>
		<Route element={<Layout />}>
			<Route index element={<Home />} />
			<Route path='products' element={<ProductList />} />
			<Route path='products/:category' element={<ProductList />} />
			<Route path='product/:id' element={<Product />} />
			<Route path='cart' element={<Cart />} />
			<Route path='checkout/success' element={<CheckoutResult result='success' />} />
			<Route path='checkout/cancel' element={<CheckoutResult result='cancel' />} />
			<Route path='login' element={<LogIn />} />
			<Route path='register' element={<Register />} />
			<Route
				path='account/*'
				element={
					<RequireAuth>
						<AccountPage />
					</RequireAuth>
				}
			/>
			<Route path='*' element={<NotFound />} />
		</Route>
		<Route
			path='admin/*'
			element={
				<RequireAuth admin>
					<Suspense fallback={<p className='container'>Loading admin…</p>}>
						<AdminApp />
					</Suspense>
				</RequireAuth>
			}
		/>
	</Routes>
)

export default AppRoutes
