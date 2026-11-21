import { Code, Globe } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { NAV_LINKS } from '../../data/catalog'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './Footer.module.css'
import LanguageSwitcher from './LanguageSwitcher'
import { useMediaQuery } from './useMediaQuery'
import { useShopFacts } from './useShopFacts'
import { AUTHOR_NAME, PORTFOLIO_URL, SOURCE_URL } from '../../data/project'

/** On phones a column is a native accordion; on wider screens it is always open. */
const Column = ({ title, collapsible, className, children }) =>
	collapsible ? (
		<details className={cx(style.column, style.accordion, className)}>
			<summary className={style.summary}>
				<h2 className={style.title}>{title}</h2>
			</summary>
			<div className={style.content}>{children}</div>
		</details>
	) : (
		<section className={cx(style.column, className)}>
			<h2 className={style.title}>{title}</h2>
			<div className={style.content}>{children}</div>
		</section>
	)

const LinkList = ({ links }) => (
	<ul role='list' className={style.links}>
		{links.map(({ to, label }) => (
			<li key={to}>
				<Link to={to} className={style.link}>
					{label}
				</Link>
			</li>
		))}
	</ul>
)

/** Delivery methods with times and prices, returns and payment — information, not links. */
const HelpInfo = () => {
	const { t } = useI18n()
	const facts = useShopFacts()
	if (!facts) return null
	const freeMethods = facts.methods.filter((method) => method.freeShipping)

	return (
		<div className={style.help}>
			<div>
				<h3 className={style.subtitle}>{t('footer.delivery')}</h3>
				<ul role='list' className={style.methods}>
					{facts.methods.map((method) => (
						<li key={method.id} className={style.method}>
							<span>
								{method.name}
								<span className={style.muted}> · {method.days}</span>
							</span>
							<span className={style.price}>{method.price}</span>
						</li>
					))}
				</ul>
				{facts.freeFrom && freeMethods.length > 0 && (
					<p className={style.note}>
						{t('footer.freeOver', {
							amount: facts.freeFrom,
							methods: freeMethods.map((method) => method.name).join(', '),
						})}
					</p>
				)}
			</div>
			<div>
				<h3 className={style.subtitle}>{t('footer.returns')}</h3>
				<p className={style.note}>{t('footer.returnsText', { days: facts.returnWindowDays })}</p>
			</div>
			<div>
				<h3 className={style.subtitle}>{t('footer.payment')}</h3>
				<p className={style.note}>{t('footer.paymentText')}</p>
			</div>
		</div>
	)
}

const Footer = () => {
	const { t } = useI18n()
	const facts = useShopFacts()
	const { user, logout } = useAuth()
	const isPhone = useMediaQuery('(max-width: 40rem)')

	const shopLinks = [
		{ to: '/products', label: t('footer.allProducts') },
		...NAV_LINKS.map(({ to, labelKey }) => ({ to, label: t(labelKey) })),
	]
	const accountLinks = user
		? [
				{ to: '/account', label: t('layout.myAccount') },
				{ to: '/account/wishlist', label: t('layout.wishlist') },
				{ to: '/cart', label: t('layout.bag') },
			]
		: [
				{ to: '/login', label: t('layout.signIn') },
				{ to: '/register', label: t('layout.createAccount') },
				{ to: '/cart', label: t('layout.bag') },
			]

	return (
		<footer className={style.footer}>
			<div className={cx('container', style.grid)}>
				<div className={style.brand}>
					<Link to='/' className={style.logo}>
						{facts?.shopName ?? 'Clothe Shop'}
					</Link>
					<p className={style.about}>{t('footer.about')}</p>
					<LanguageSwitcher variant='field' className={style.language} />
				</div>

				<Column title={t('footer.shop')} collapsible={isPhone}>
					<LinkList links={shopLinks} />
				</Column>

				<Column title={t('footer.help')} collapsible={isPhone} className={style.helpColumn}>
					<HelpInfo />
				</Column>

				<Column title={t('footer.account')} collapsible={isPhone}>
					{user && <p className={style.muted}>{t('layout.signedInAs', { name: user.username })}</p>}
					<LinkList links={accountLinks} />
					{user && (
						<button type='button' className={style.link} onClick={logout}>
							{t('layout.signOut')}
						</button>
					)}
				</Column>
			</div>

			<div className={style.bottom}>
				<div className={cx('container', style.bottomInner)}>
					<p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
					<p className={style.credits}>
						<span>
							{t('footer.author')}: <strong className={style.author}>{AUTHOR_NAME}</strong>
						</span>
						<a href={PORTFOLIO_URL} target='_blank' rel='noreferrer' className={style.creditLink}>
							<Globe size={14} aria-hidden /> {t('footer.portfolio')}
						</a>
						<a href={SOURCE_URL} target='_blank' rel='noreferrer' className={style.creditLink}>
							<Code size={14} aria-hidden /> {t('footer.source')}
						</a>
					</p>
				</div>
			</div>
		</footer>
	)
}

export default Footer
