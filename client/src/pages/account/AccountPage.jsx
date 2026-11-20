import { Heart, LogOut, MapPin, Package, UserRound } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { cx } from '../../utils/cx'
import style from './AccountPage.module.css'
import AddressesPage from './AddressesPage'
import OrdersPage from './OrdersPage'
import ProfilePage from './ProfilePage'
import WishlistPage from './WishlistPage'

const SECTIONS = [
	{ to: '/account', label: 'Orders', icon: Package, end: true },
	{ to: '/account/wishlist', label: 'Wishlist', icon: Heart },
	{ to: '/account/addresses', label: 'Addresses', icon: MapPin },
	{ to: '/account/profile', label: 'Profile', icon: UserRound },
]

/** /account/* — side navigation (tabs on mobile) and the active section. */
const AccountPage = () => {
	const { user, logout } = useAuth()

	return (
		<div className={cx('container', style.page)}>
			<div className={style.intro}>
				<p className='eyebrow'>My account</p>
				<p className={style.greeting}>Hi, {user.username}</p>
			</div>

			<div className={style.layout}>
				<nav className={style.nav} aria-label='Account'>
					<ul role='list' className={style.navList}>
						{SECTIONS.map(({ to, label, icon: Icon, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									className={({ isActive }) => cx(style.navLink, isActive && style.active)}
								>
									<Icon size={18} aria-hidden /> {label}
								</NavLink>
							</li>
						))}
						<li className={style.signOut}>
							<button type='button' className={style.navLink} onClick={logout}>
								<LogOut size={18} aria-hidden /> Sign out
							</button>
						</li>
					</ul>
				</nav>

				<div className={style.content}>
					<Routes>
						<Route index element={<OrdersPage />} />
						<Route path='wishlist' element={<WishlistPage />} />
						<Route path='addresses' element={<AddressesPage />} />
						<Route path='profile' element={<ProfilePage />} />
						<Route path='*' element={<Navigate to='/account' replace />} />
					</Routes>
				</div>
			</div>
		</div>
	)
}

export default AccountPage
