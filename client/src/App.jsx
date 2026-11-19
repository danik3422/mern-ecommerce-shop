import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import ScrollToTop from './components/ScrollToTop'
import Cart from './pages/Cart'
import Home from './pages/Home'
import LogIn from './pages/LogIn'
import NotFound from './pages/NotFound'
import Product from './pages/Product'
import ProductList from './pages/ProductList'
import Register from './pages/Register'
import './styles/main.scss'

const App = () => (
	<AuthProvider>
		<CartProvider>
			<BrowserRouter>
				<ScrollToTop />
				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/products' element={<ProductList />} />
					<Route path='/products/:category' element={<ProductList />} />
					<Route path='/product/:id' element={<Product />} />
					<Route path='/cart' element={<Cart />} />
					<Route path='/login' element={<LogIn />} />
					<Route path='/register' element={<Register />} />
					<Route path='*' element={<NotFound />} />
				</Routes>
			</BrowserRouter>
		</CartProvider>
	</AuthProvider>
)

export default App
