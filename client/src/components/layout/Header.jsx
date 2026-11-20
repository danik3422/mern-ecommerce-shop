import { Heart, LayoutDashboard, LogOut, Menu, ShoppingBag, User, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useCart } from '../../cart/useCart'
import { NAV_LINKS } from '../../data/catalog'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './Header.module.css'
import LanguageSwitcher from './LanguageSwitcher'
import SearchForm from './SearchForm'

const Header = () => {
	const { user, logout } = useAuth()
	const { count } = useCart()
	const { t } = useI18n()
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
					aria-label={isMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
				>
					{isMenuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
				</button>

				<Link to='/' className={style.logo}>
					Clothe Shop
				</Link>

				<nav
					id='main-navigation'
					className={cx(style.nav, isMenuOpen && style.navOpen)}
					aria-label={t('layout.mainNav')}
				>
					<div className={style.mobileSearch}>
						<SearchForm />
					</div>
					<ul role='list' className={style.navList}>
						{NAV_LINKS.map(({ to, labelKey, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									className={({ isActive }) => cx(style.navLink, isActive && style.active)}
								>
									{t(labelKey)}
								</NavLink>
							</li>
						))}
						{user && (
							<li className={style.mobileOnly}>
								<button type='button' className={style.navLink} onClick={logout}>
									{t('layout.signOut')}
								</button>
							</li>
						)}
					</ul>
				</nav>

				<div className={style.search}>
					<SearchForm />
				</div>

				<div className={style.actions}>
					<LanguageSwitcher className={style.language} />
					{user?.isAdmin && (
						<Link
							to='/admin'
							className={style.iconButton}
							aria-label={t('layout.admin')}
							title={t('layout.admin')}
						>
							<LayoutDashboard size={20} aria-hidden />
						</Link>
					)}
					{user ? (
						<>
							<Link
								to='/account'
								className={style.iconButton}
								aria-label={t('layout.accountOf', { name: user.username })}
								title={t('layout.account')}
							>
								<User size={20} aria-hidden />
							</Link>
							<Link
								to='/account/wishlist'
								className={cx(style.iconButton, style.hideOnMobile)}
								aria-label={t('layout.wishlist')}
								title={t('layout.wishlist')}
							>
								<Heart size={20} aria-hidden />
							</Link>
							<button
								type='button'
								className={cx(style.iconButton, style.hideOnMobile)}
								onClick={logout}
								aria-label={t('layout.signOut')}
								title={t('layout.signOut')}
							>
								<LogOut size={20} aria-hidden />
							</button>
						</>
					) : (
						<Link
							to='/login'
							className={style.iconButton}
							aria-label={t('layout.signIn')}
							title={t('layout.signIn')}
						>
							<User size={20} aria-hidden />
						</Link>
					)}
					<Link
						to='/cart'
						className={style.iconButton}
						aria-label={t('layout.bagCount', { count })}
						title={t('layout.bag')}
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
