import { Link, Route, Routes } from 'react-router'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import AdminLayout from './AdminLayout'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import OrderDetail from './pages/OrderDetail'
import OrdersList from './pages/OrdersList'
import { EditProduct, NewProduct } from './pages/ProductEdit'
import ProductsList from './pages/ProductsList'
import PromoCodes from './pages/PromoCodes'
import Reviews from './pages/Reviews'

/** /admin/* — admin panel with its own layout (the route is guarded in AppRoutes). */
const AdminApp = () => (
	<Routes>
		<Route element={<AdminLayout />}>
			<Route index element={<Dashboard />} />
			<Route path='products' element={<ProductsList />} />
			<Route path='products/new' element={<NewProduct />} />
			<Route path='products/:id' element={<EditProduct />} />
			<Route path='orders' element={<OrdersList />} />
			<Route path='orders/:id' element={<OrderDetail />} />
			<Route path='customers' element={<Customers />} />
			<Route path='reviews' element={<Reviews />} />
			<Route path='promo-codes' element={<PromoCodes />} />
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
