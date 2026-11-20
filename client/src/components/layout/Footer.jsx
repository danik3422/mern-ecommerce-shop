import { Link } from 'react-router'
import { NAV_LINKS } from '../../data/catalog'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import FreeShippingNote from '../cart/FreeShippingNote'
import style from './Footer.module.css'
import LanguageSwitcher from './LanguageSwitcher'

const ACCOUNT_LINKS = [
	{ to: '/cart', labelKey: 'layout.bag' },
	{ to: '/login', labelKey: 'layout.signIn' },
	{ to: '/register', labelKey: 'layout.createAccount' },
]

const LinkColumn = ({ title, links }) => {
	const { t } = useI18n()
	return (
		<nav aria-label={title}>
			<h2 className='eyebrow'>{title}</h2>
			<ul role='list' className={style.links}>
				{links.map(({ to, labelKey }) => (
					<li key={to}>
						<Link to={to} className={style.link}>
							{t(labelKey)}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	)
}

const Footer = () => {
	const { t } = useI18n()
	return (
		<footer className={style.footer}>
			<div className={cx('container', style.grid)}>
				<div className={style.brand}>
					<p className={style.logo}>Clothe Shop</p>
					<p className={style.text}>
						{t('layout.footerAbout')} <FreeShippingNote icon={false} />.
					</p>
					<LanguageSwitcher />
				</div>
				<LinkColumn title={t('layout.footerShop')} links={NAV_LINKS} />
				<LinkColumn title={t('layout.footerAccount')} links={ACCOUNT_LINKS} />
			</div>
			<div className={style.bottom}>
				<p className='container'>© {new Date().getFullYear()} Clothe Shop</p>
			</div>
		</footer>
	)
}

export default Footer
