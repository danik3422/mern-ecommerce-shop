import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import './styles/global.css'

const App = () => (
	<AuthProvider>
		<CartProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</CartProvider>
	</AuthProvider>
)

export default App
