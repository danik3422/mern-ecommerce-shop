import { useQuery } from '@tanstack/react-query'
import { ExternalLink, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { adminKeys, fetchAdminCounts, fetchMe } from '../api/admin'
import { useAuth } from '../auth/useAuth'
import { cx } from '../utils/cx'
import { activeNavTo, allowedNav } from './navigation'
import style from './AdminLayout.module.css'

const COUNTS_REFRESH_MS = 60_000

/** Admin frame: sidebar on wide screens, top bar with a menu on small ones. */
const AdminLayout = () => {
	const { user, logout, updateUser } = useAuth()
	const location = useLocation()
	const { pathname } = location
	const navItems = allowedNav(user)
	const activeTo = activeNavTo(navItems, location)

	// permissions may have changed since signing in: refresh the stored user once per visit
	useQuery({
		queryKey: adminKeys.me,
		queryFn: async ({ signal }) => {
			const me = await fetchMe(signal)
			updateUser(me)
			return me
		},
		staleTime: Infinity,
	})
	const counts = useQuery({
		queryKey: adminKeys.counts,
		queryFn: ({ signal }) => fetchAdminCounts(signal),
		refetchInterval: COUNTS_REFRESH_MS,
	}).data
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
							{navItems.map(({ to, label, icon: Icon, count, countLabel }) => {
								const number = count && counts?.[count]
								const content = (
									<>
										<Icon size={18} aria-hidden />
										{label}
										{number > 0 && (
											<span className={style.count} title={`${number} ${countLabel}`}>
												{number}
												<span className='visually-hidden'> {countLabel}</span>
											</span>
										)}
									</>
								)
								return (
									<li key={to}>
										<Link
											to={to}
											className={cx(style.navLink, to === activeTo && style.active)}
											aria-current={to === activeTo ? 'page' : undefined}
										>
											{content}
										</Link>
									</li>
								)
							})}
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
						<p className={style.user}>
							Signed in as {user.username}
							{user.isOwner && ' (owner)'}
						</p>
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
