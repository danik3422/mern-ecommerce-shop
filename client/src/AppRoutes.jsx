import { Route, Routes } from 'react-router'
import Layout from './components/layout/Layout'
import Cart from './pages/Cart'
import Home from './pages/Home'
import LogIn from './pages/LogIn'
import NotFound from './pages/NotFound'
import Product from './pages/Product'
import ProductList from './pages/ProductList'
import Register from './pages/Register'

const AppRoutes = () => (
	<Routes>
		<Route element={<Layout />}>
			<Route index element={<Home />} />
			<Route path='products' element={<ProductList />} />
			<Route path='products/:category' element={<ProductList />} />
			<Route path='product/:id' element={<Product />} />
			<Route path='cart' element={<Cart />} />
			<Route path='login' element={<LogIn />} />
			<Route path='register' element={<Register />} />
			<Route path='*' element={<NotFound />} />
		</Route>
	</Routes>
)

export default AppRoutes
