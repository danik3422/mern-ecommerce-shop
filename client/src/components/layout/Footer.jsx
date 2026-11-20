import { Link } from 'react-router'
import { NAV_LINKS } from '../../data/catalog'
import { FREE_SHIPPING_FROM } from '../../cart/pricing'
import { formatMoney } from '../../utils/money'
import { cx } from '../../utils/cx'
import style from './Footer.module.css'

const ACCOUNT_LINKS = [
	{ to: '/cart', label: 'Bag' },
	{ to: '/login', label: 'Sign in' },
	{ to: '/register', label: 'Create account' },
]

const LinkColumn = ({ title, links }) => (
	<nav aria-label={title}>
		<h2 className='eyebrow'>{title}</h2>
		<ul role='list' className={style.links}>
			{links.map(({ to, label }) => (
				<li key={to}>
					<Link to={to} className={style.link}>
						{label}
					</Link>
				</li>
			))}
		</ul>
	</nav>
)

const Footer = () => (
	<footer className={style.footer}>
		<div className={cx('container', style.grid)}>
			<div className={style.brand}>
				<p className={style.logo}>Clothe Shop</p>
				<p className={style.text}>
					Everyday clothing and accessories. Free shipping on orders over{' '}
					{formatMoney(FREE_SHIPPING_FROM)}.
				</p>
			</div>
			<LinkColumn title='Shop' links={NAV_LINKS} />
			<LinkColumn title='Account' links={ACCOUNT_LINKS} />
		</div>
		<div className={style.bottom}>
			<p className='container'>© {new Date().getFullYear()} Clothe Shop</p>
		</div>
	</footer>
)

export default Footer
