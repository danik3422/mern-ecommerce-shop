import { Megaphone, RotateCcw, Truck, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './AnnouncementBar.module.css'
import LanguageSwitcher from './LanguageSwitcher'
import { useShopFacts } from './useShopFacts'

/**
 * Slim bar above the header with delivery and returns facts. It is not sticky, so it
 * scrolls away and leaves only the compact header. On wide screens it also holds the
 * secondary links (admin, sign out) and the language switcher; on phones those live in the menu.
 * The height is fixed, so the page does not jump when the shop config arrives.
 */
const AnnouncementBar = () => {
	const facts = useShopFacts()
	const { user, logout } = useAuth()
	const { t } = useI18n()

	const items = facts && [
		facts.announcement && { key: 'announcement', icon: Megaphone, text: facts.announcement },
		facts.freeDelivery && { key: 'delivery', icon: Truck, text: facts.freeDelivery },
		{ key: 'returns', icon: RotateCcw, text: facts.freeReturns },
		facts.deliveryTime && { key: 'time', icon: Zap, text: facts.deliveryTime },
	]

	return (
		<aside className={style.bar} aria-label={t('layout.shopInfo')}>
			<div className={cx('container', style.inner)}>
				<ul role='list' className={style.facts}>
					{items?.filter(Boolean).map(({ key, icon: Icon, text }, index, list) => (
						<li
							key={key}
							className={style.fact}
							// phones show one fact at a time; CSS staggers them with these variables
							style={{ '--index': index, '--count': list.length }}
						>
							<Icon size={14} aria-hidden />
							{text}
						</li>
					))}
				</ul>
				<div className={style.tools}>
					{user?.isAdmin && (
						<Link to='/admin' className={style.tool}>
							{t('layout.admin')}
						</Link>
					)}
					{user && (
						<button type='button' className={style.tool} onClick={logout}>
							{t('layout.signOut')}
						</button>
					)}
					<LanguageSwitcher className={style.language} />
				</div>
			</div>
		</aside>
	)
}

export default AnnouncementBar
