import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { ToastProvider } from './components/ui/toast/ToastProvider'
import './styles/global.css'

const App = () => (
	<I18nProvider>
		<AuthProvider>
			<CartProvider>
				<BrowserRouter>
					<ToastProvider>
						<AppRoutes />
					</ToastProvider>
				</BrowserRouter>
			</CartProvider>
		</AuthProvider>
	</I18nProvider>
)

export default App
