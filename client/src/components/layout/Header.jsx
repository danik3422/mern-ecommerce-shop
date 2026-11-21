import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useCart } from '../../cart/useCart'
import { NAV_LINKS } from '../../data/catalog'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import AnnouncementBar from './AnnouncementBar'
import style from './Header.module.css'
import MobileMenu from './MobileMenu'
import SearchForm from './SearchForm'

/** Icon with a short label under it; the label is hidden on narrow screens (aria-label stays). */
const HeaderAction = ({ to, icon: Icon, label, ariaLabel, badge, className }) => (
	<Link to={to} className={cx(style.action, className)} aria-label={ariaLabel} title={label}>
		<span className={style.actionIcon}>
			<Icon size={20} strokeWidth={1.75} aria-hidden />
			{badge}
		</span>
		<span className={style.actionLabel} aria-hidden>
			{label}
		</span>
	</Link>
)

/**
 * Store header: an info bar that scrolls away, then a sticky 4rem row with the logo,
 * categories, search and the account / wishlist / bag actions.
 * Below 64rem the categories move into a menu drawer; below 80rem the search field
 * becomes a button that opens a full-width search panel.
 */
const Header = () => {
	const { user } = useAuth()
	const { count } = useCart()
	const { t } = useI18n()
	const { pathname } = useLocation()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [isSearchOpen, setIsSearchOpen] = useState(false)
	const [openedAt, setOpenedAt] = useState(pathname)
	const searchButtonRef = useRef(null)

	// close the menu and the search panel after navigating (adjusted during render, not in an effect)
	if (openedAt !== pathname) {
		setOpenedAt(pathname)
		setIsMenuOpen(false)
		setIsSearchOpen(false)
	}

	const closeSearch = ({ returnFocus = true } = {}) => {
		setIsSearchOpen(false)
		if (returnFocus) searchButtonRef.current?.focus()
	}

	const badge = count > 0 && (
		<span className={style.badge} aria-hidden>
			{count > 99 ? '99+' : count}
		</span>
	)

	return (
		<>
			<AnnouncementBar />
			<header className={style.header}>
				<div className={cx('container', style.inner)}>
					<button
						type='button'
						className={cx(style.iconButton, style.menuButton)}
						onClick={() => setIsMenuOpen(true)}
						aria-expanded={isMenuOpen}
						aria-haspopup='dialog'
						aria-label={t('layout.openMenu')}
					>
						<Menu size={22} strokeWidth={1.75} aria-hidden />
					</button>

					<Link to='/' className={style.logo}>
						Clothe Shop
					</Link>

					<nav className={style.nav} aria-label={t('layout.mainNav')}>
						<ul role='list' className={style.navList}>
							{NAV_LINKS.map(({ to, labelKey, end, highlight }) => (
								<li key={to}>
									<NavLink
										to={to}
										end={end}
										className={({ isActive }) =>
											cx(style.navLink, highlight && style.highlight, isActive && style.active)
										}
									>
										{t(labelKey)}
									</NavLink>
								</li>
							))}
						</ul>
					</nav>

					<div className={style.search}>
						<SearchForm />
					</div>

					<div className={style.actions}>
						<button
							ref={searchButtonRef}
							type='button'
							className={cx(style.action, style.searchButton)}
							onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
							aria-expanded={isSearchOpen}
							aria-controls={isSearchOpen ? 'search-panel' : undefined}
							aria-label={isSearchOpen ? t('layout.closeSearch') : t('layout.openSearch')}
						>
							<span className={style.actionIcon}>
								{isSearchOpen ? (
									<X size={20} strokeWidth={1.75} aria-hidden />
								) : (
									<Search size={20} strokeWidth={1.75} aria-hidden />
								)}
							</span>
							<span className={style.actionLabel} aria-hidden>
								{t('layout.search')}
							</span>
						</button>
						<HeaderAction
							to={user ? '/account' : '/login'}
							icon={User}
							label={user ? t('layout.account') : t('layout.signIn')}
							ariaLabel={user ? t('layout.accountOf', { name: user.username }) : t('layout.signIn')}
						/>
						{user && (
							<HeaderAction
								to='/account/wishlist'
								icon={Heart}
								label={t('layout.wishlist')}
								ariaLabel={t('layout.wishlist')}
								className={style.hideOnMobile}
							/>
						)}
						<HeaderAction
							to='/cart'
							icon={ShoppingBag}
							label={t('layout.bag')}
							ariaLabel={t('layout.bagCount', { count })}
							badge={badge}
						/>
					</div>
				</div>

				{isSearchOpen && (
					<div id='search-panel' className={style.searchPanel}>
						<div className='container'>
							<SearchForm
								autoFocus
								onSearch={() => closeSearch({ returnFocus: false })}
								onEscape={closeSearch}
							/>
						</div>
					</div>
				)}
			</header>

			{isMenuOpen && <MobileMenu onClose={() => setIsMenuOpen(false)} />}
		</>
	)
}

export default Header
