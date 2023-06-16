import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Cart from './pages/Cart'
import Home from './pages/Home'
import LogIn from './pages/LogIn'
import Product from './pages/Product'
import ProductList from './pages/ProductList'
import Register from './pages/Register'
import './styles/main.scss'

const App = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<Home />} />
				<Route path='/products/:category' element={<ProductList />} />
				<Route path='/product/:name' element={<Product />} />
				<Route path='/cart' element={<Cart />} />
				<Route path='/login' element={<LogIn />} />
				<Route path='/register' element={<Register />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App
