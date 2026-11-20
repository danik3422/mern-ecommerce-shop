import {
	ExternalLink,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquare,
	Package,
	ShoppingCart,
	Users,
	X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { cx } from '../utils/cx'
import style from './AdminLayout.module.css'

const NAV = [
	{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
	{ to: '/admin/products', label: 'Products', icon: Package },
	{ to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
	{ to: '/admin/customers', label: 'Customers', icon: Users },
	{ to: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
]

/** Admin frame: sidebar on wide screens, top bar with a menu on small ones. */
const AdminLayout = () => {
	const { user, logout } = useAuth()
	const { pathname } = useLocation()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [menuPath, setMenuPath] = useState(pathname)

	// close the menu after navigating (state adjusted during render, not in an effect)
	if (menuPath !== pathname) {
		setMenuPath(pathname)
		setIsMenuOpen(false)
	}

	return (
		<div className={style.layout}>
			<a href='#admin-main' className={style.skipLink}>
				Skip to content
			</a>

			<header className={style.sidebar}>
				<div className={style.brandRow}>
					<Link to='/admin' className={style.brand}>
						Clothe Shop <span className={style.badge}>Admin</span>
					</Link>
					<button
						type='button'
						className={style.menuButton}
						onClick={() => setIsMenuOpen((open) => !open)}
						aria-expanded={isMenuOpen}
						aria-controls='admin-navigation'
						aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					>
						{isMenuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
					</button>
				</div>

				<div id='admin-navigation' className={cx(style.navPanel, isMenuOpen && style.navPanelOpen)}>
					<nav aria-label='Admin'>
						<ul role='list' className={style.navList}>
							{NAV.map(({ to, label, icon: Icon, end }) => (
								<li key={to}>
									<NavLink
										to={to}
										end={end}
										className={({ isActive }) => cx(style.navLink, isActive && style.active)}
									>
										<Icon size={18} aria-hidden />
										{label}
									</NavLink>
								</li>
							))}
						</ul>
					</nav>

					<div className={style.footer}>
						<Link to='/' className={style.navLink}>
							<ExternalLink size={18} aria-hidden />
							View shop
						</Link>
						<button type='button' className={style.navLink} onClick={logout}>
							<LogOut size={18} aria-hidden />
							Sign out
						</button>
						<p className={style.user}>Signed in as {user.username}</p>
					</div>
				</div>
			</header>

			<main id='admin-main' className={style.main} tabIndex={-1}>
				<Outlet />
			</main>
		</div>
	)
}

export default AdminLayout
