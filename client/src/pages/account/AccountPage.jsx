import { Heart, LogOut, MapPin, Package, ShieldCheck, UserRound } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { cx } from '../../utils/cx'
import style from './AccountPage.module.css'
import AddressesPage from './AddressesPage'
import OrderPage from './OrderPage'
import OrdersPage from './OrdersPage'
import ProfilePage from './ProfilePage'
import SecurityPage from './SecurityPage'
import WishlistPage from './WishlistPage'
import { useI18n } from '../../i18n/useI18n'

const SECTIONS = [
	{ to: '/account', labelKey: 'account.orders', icon: Package, end: true },
	{ to: '/account/wishlist', labelKey: 'account.wishlist', icon: Heart },
	{ to: '/account/addresses', labelKey: 'account.addresses', icon: MapPin },
	{ to: '/account/profile', labelKey: 'account.profile', icon: UserRound },
	{ to: '/account/security', labelKey: 'account.security', icon: ShieldCheck },
]

/** /account/* — side navigation (tabs on mobile) and the active section. */
const AccountPage = () => {
	const { user, logout } = useAuth()
	const { t } = useI18n()

	return (
		<div className={cx('container', style.page)}>
			<div className={style.intro}>
				<p className='eyebrow'>{t('account.myAccount')}</p>
				<p className={style.greeting}>{t('account.hi', { name: user.username })}</p>
			</div>

			<div className={style.layout}>
				<nav className={style.nav} aria-label={t('account.nav')}>
					<ul role='list' className={style.navList}>
						{SECTIONS.map(({ to, labelKey, icon: Icon, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									className={({ isActive }) => cx(style.navLink, isActive && style.active)}
								>
									<Icon size={18} aria-hidden /> {t(labelKey)}
								</NavLink>
							</li>
						))}
						<li className={style.signOut}>
							<button type='button' className={style.navLink} onClick={logout}>
								<LogOut size={18} aria-hidden /> {t('account.signOut')}
							</button>
						</li>
					</ul>
				</nav>

				<div className={style.content}>
					<Routes>
						<Route index element={<OrdersPage />} />
						<Route path='orders/:id' element={<OrderPage />} />
						<Route path='wishlist' element={<WishlistPage />} />
						<Route path='addresses' element={<AddressesPage />} />
						<Route path='profile' element={<ProfilePage />} />
						<Route path='security' element={<SecurityPage />} />
						<Route path='*' element={<Navigate to='/account' replace />} />
					</Routes>
				</div>
			</div>
		</div>
	)
}

export default AccountPage
