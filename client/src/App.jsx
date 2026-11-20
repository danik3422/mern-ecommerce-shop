import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import { ToastProvider } from './components/ui/toast/ToastProvider'
import './styles/global.css'

const App = () => (
	<AuthProvider>
		<CartProvider>
			<BrowserRouter>
				<ToastProvider>
					<AppRoutes />
				</ToastProvider>
			</BrowserRouter>
		</CartProvider>
	</AuthProvider>
)

export default App
