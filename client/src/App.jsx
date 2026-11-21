import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { CartProvider } from './cart/CartProvider'
import DemoNotice from './components/layout/DemoNotice'
import { I18nProvider } from './i18n/I18nProvider'
import { ConfirmProvider } from './components/ui/confirm/ConfirmProvider'
import { ToastProvider } from './components/ui/toast/ToastProvider'
import './styles/global.css'

const App = () => (
	<I18nProvider>
		<AuthProvider>
			<CartProvider>
				<BrowserRouter>
					<ToastProvider>
						<ConfirmProvider>
							<AppRoutes />
							{/* first visit: the site is a diploma project, not a real shop */}
							<DemoNotice />
						</ConfirmProvider>
					</ToastProvider>
				</BrowserRouter>
			</CartProvider>
		</AuthProvider>
	</I18nProvider>
)

export default App
