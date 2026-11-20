import { LogOut, Menu, ShoppingBag, User, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useCart } from '../../cart/useCart'
import { NAV_LINKS } from '../../data/catalog'
import { cx } from '../../utils/cx'
import style from './Header.module.css'

const Header = () => {
	const { user, logout } = useAuth()
	const { count } = useCart()
	const { pathname } = useLocation()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [menuPath, setMenuPath] = useState(pathname)

	// close the mobile menu after navigating (state adjusted during render, not in an effect)
	if (menuPath !== pathname) {
		setMenuPath(pathname)
		setIsMenuOpen(false)
	}

	return (
		<header className={style.header}>
			<div className={cx('container', style.inner)}>
				<button
					type='button'
					className={cx(style.iconButton, style.menuButton)}
					onClick={() => setIsMenuOpen((open) => !open)}
					aria-expanded={isMenuOpen}
					aria-controls='main-navigation'
					aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
				>
					{isMenuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
				</button>

				<Link to='/' className={style.logo}>
					Clothe Shop
				</Link>

				<nav
					id='main-navigation'
					className={cx(style.nav, isMenuOpen && style.navOpen)}
					aria-label='Main'
				>
					<ul role='list' className={style.navList}>
						{NAV_LINKS.map(({ to, label, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									className={({ isActive }) => cx(style.navLink, isActive && style.active)}
								>
									{label}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>

				<div className={style.actions}>
					{user ? (
						<>
							<span className={style.greeting}>Hi, {user.username}</span>
							<button
								type='button'
								className={style.iconButton}
								onClick={logout}
								aria-label='Sign out'
								title='Sign out'
							>
								<LogOut size={20} aria-hidden />
							</button>
						</>
					) : (
						<Link to='/login' className={style.iconButton} aria-label='Sign in' title='Sign in'>
							<User size={20} aria-hidden />
						</Link>
					)}
					<Link
						to='/cart'
						className={style.iconButton}
						aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}
						title='Bag'
					>
						<ShoppingBag size={20} aria-hidden />
						{count > 0 && (
							<span className={style.badge} aria-hidden>
								{count > 99 ? '99+' : count}
							</span>
						)}
					</Link>
				</div>
			</div>
		</header>
	)
}

export default Header
