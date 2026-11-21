import {
	ChevronRight,
	Heart,
	LayoutDashboard,
	LogIn,
	LogOut,
	RotateCcw,
	Truck,
	User,
	UserPlus,
} from 'lucide-react'
import { useId } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { NAV_LINKS } from '../../data/catalog'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import Drawer from '../ui/Drawer'
import LanguageSwitcher from './LanguageSwitcher'
import style from './MobileMenu.module.css'
import { useShopFacts } from './useShopFacts'

/**
 * Menu drawer for phones and tablets: categories as large tap targets, account links,
 * the language and short shop facts. Drawer handles focus, Esc and returning focus.
 */
const MobileMenu = ({ onClose }) => {
	const { user, logout } = useAuth()
	const { t } = useI18n()
	const facts = useShopFacts()
	const accountTitleId = useId()

	const accountLinks = user
		? [
				{ to: '/account', icon: User, label: t('layout.myAccount'), end: true },
				{ to: '/account/wishlist', icon: Heart, label: t('layout.wishlist') },
				user.isAdmin && { to: '/admin', icon: LayoutDashboard, label: t('layout.admin') },
			]
		: [
				{ to: '/login', icon: LogIn, label: t('layout.signIn') },
				{ to: '/register', icon: UserPlus, label: t('layout.createAccount') },
			]

	return (
		<Drawer
			title={t('layout.menu')}
			side='left'
			onClose={onClose}
			closeLabel={t('layout.closeMenu')}
		>
			<nav aria-label={t('layout.categories')}>
				<ul role='list' className={style.categories}>
					{NAV_LINKS.map(({ to, labelKey, end, highlight }) => (
						<li key={to}>
							<NavLink
								to={to}
								end={end}
								onClick={onClose}
								className={({ isActive }) =>
									cx(style.category, highlight && style.highlight, isActive && style.active)
								}
							>
								{t(labelKey)}
								<ChevronRight size={18} aria-hidden className={style.chevron} />
							</NavLink>
						</li>
					))}
				</ul>
			</nav>

			<section className={style.section} aria-labelledby={accountTitleId}>
				<h2 id={accountTitleId} className='eyebrow'>
					{user ? t('layout.signedInAs', { name: user.username }) : t('layout.account')}
				</h2>
				<ul role='list' className={style.links}>
					{accountLinks.filter(Boolean).map(({ to, icon: Icon, label, end }) => (
						<li key={to}>
							<NavLink to={to} end={end} onClick={onClose} className={style.link}>
								<Icon size={18} strokeWidth={1.75} aria-hidden />
								{label}
							</NavLink>
						</li>
					))}
					{user && (
						<li>
							<button
								type='button'
								className={style.link}
								onClick={() => {
									logout()
									onClose()
								}}
							>
								<LogOut size={18} strokeWidth={1.75} aria-hidden />
								{t('layout.signOut')}
							</button>
						</li>
					)}
				</ul>
			</section>

			<div className={style.section}>
				<LanguageSwitcher variant='field' className={style.language} />
			</div>

			{facts && (
				<ul role='list' className={style.facts}>
					{facts.freeDelivery && (
						<li>
							<Truck size={16} aria-hidden /> {facts.freeDelivery}
						</li>
					)}
					<li>
						<RotateCcw size={16} aria-hidden /> {facts.freeReturns}
					</li>
				</ul>
			)}
		</Drawer>
	)
}

export default MobileMenu
