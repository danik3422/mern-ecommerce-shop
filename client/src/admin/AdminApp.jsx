import { Link, Navigate, Route, Routes } from 'react-router'
import { useAuth } from '../auth/useAuth'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import AdminLayout from './AdminLayout'
import RequirePermission, { NoAccess } from './components/NoAccess'
import Activity from './pages/Activity'
import Analytics from './pages/Analytics'
import CustomerDetail from './pages/CustomerDetail'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import OrderDetail from './pages/OrderDetail'
import OrdersList from './pages/OrdersList'
import { EditProduct, NewProduct } from './pages/ProductEdit'
import ProductsList from './pages/ProductsList'
import PromoCodes from './pages/PromoCodes'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Team from './pages/Team'
import { allowedNav } from './navigation'
import { can } from './permissions'

/** /admin — the dashboard, or the first section this staff member may open. */
const AdminHome = () => {
	const { user } = useAuth()
	if (can(user, 'dashboard')) return <Dashboard />
	const first = allowedNav(user)[0]
	return first ? <Navigate to={first.to} replace /> : <NoAccess area='any section yet' />
}

/** Wraps a page in its permission check. */
const guard = (permission, area, page) => (
	<RequirePermission permission={permission} area={area}>
		{page}
	</RequirePermission>
)

/** /admin/* — admin panel with its own layout (staff only; the route is guarded in AppRoutes). */
const AdminApp = () => (
	<Routes>
		<Route element={<AdminLayout />}>
			<Route index element={<AdminHome />} />
			<Route path='analytics' element={guard('analytics', 'analytics', <Analytics />)} />
			<Route path='products' element={guard('products', 'products', <ProductsList />)} />
			<Route path='products/new' element={guard('products', 'products', <NewProduct />)} />
			<Route path='products/:id' element={guard('products', 'products', <EditProduct />)} />
			<Route path='orders' element={guard('orders', 'orders', <OrdersList />)} />
			<Route path='orders/:id' element={guard('orders', 'orders', <OrderDetail />)} />
			<Route path='customers' element={guard('customers', 'customers', <Customers />)} />
			<Route path='customers/:id' element={guard('customers', 'customers', <CustomerDetail />)} />
			<Route path='reviews' element={guard('reviews', 'reviews', <Reviews />)} />
			<Route path='promo-codes' element={guard('promoCodes', 'promo codes', <PromoCodes />)} />
			<Route path='settings' element={guard('settings', 'settings', <Settings />)} />
			<Route path='team' element={guard('team', 'the team', <Team />)} />
			<Route path='activity' element={<Activity />} />
			<Route
				path='*'
				element={
					<EmptyState
						title='Page not found'
						action={
							<Button as={Link} to='/admin' variant='secondary'>
								Back to dashboard
							</Button>
						}
					/>
				}
			/>
		</Route>
	</Routes>
)

export default AdminApp
