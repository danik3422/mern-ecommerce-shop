import { ExternalLink, GraduationCap } from 'lucide-react'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { PORTFOLIO_URL, SOURCE_URL } from '../../data/project'
import { useModal } from '../../hooks/useModal'
import { LOCALES } from '../../i18n/translate'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import { load, save } from '../../utils/storage'
import Button from '../ui/Button'
import style from './DemoNotice.module.css'

/** Bump the version to show the notice again to everyone after changing its text. */
const STORAGE_KEY = 'demoNoticeAccepted'
const VERSION = 1

/** Where visitors who decline are sent. */
export const LEAVE_URL = 'https://www.google.com/'

/**
 * Leaves the site for Google search. `replace` keeps the shop out of the history,
 * so "Back" does not bring the visitor straight back to the notice.
 */
const leaveSite = () => window.location.replace(LEAVE_URL)

/**
 * Shown on the first visit: the site is a diploma project, not a real shop or brand.
 * The visitor must confirm it before using the site; declining leaves the site.
 * Escape and clicks outside do nothing — an answer is required.
 * @param onDecline what "No" does — leaves the site (replaceable in tests)
 */
const DemoNotice = ({ onDecline = leaveSite }) => {
	const [accepted, setAccepted] = useState(() => load(STORAGE_KEY, 0) >= VERSION)
	if (accepted) return null

	const accept = () => {
		save(STORAGE_KEY, VERSION)
		setAccepted(true)
	}

	return <NoticeDialog onAccept={accept} onDecline={onDecline} />
}

const NoticeDialog = ({ onAccept, onDecline }) => {
	const { t, locale, setLocale } = useI18n()
	// Escape must not dismiss it, so the close callback does nothing
	const dialogRef = useModal(() => {})
	const titleId = useId()
	const textId = useId()

	return createPortal(
		<div className={style.root}>
			<div className={style.backdrop} aria-hidden />
			<div
				ref={dialogRef}
				className={style.dialog}
				role='alertdialog'
				aria-modal='true'
				aria-labelledby={titleId}
				aria-describedby={textId}
				tabIndex={-1}
			>
				<div className={style.top}>
					<span className={style.badge}>
						<GraduationCap size={16} aria-hidden /> {t('demo.badge')}
					</span>
					<div className={style.languages} role='group' aria-label={t('layout.language')}>
						{LOCALES.map((code) => (
							<button
								key={code}
								type='button'
								className={cx(style.language, code === locale && style.active)}
								aria-pressed={code === locale}
								onClick={() => setLocale(code)}
							>
								{code.toUpperCase()}
							</button>
						))}
					</div>
				</div>

				<h2 id={titleId} className={style.title}>
					{t('demo.title')}
				</h2>
				<div id={textId} className={style.text}>
					<p>{t('demo.notShop')}</p>
					<p>{t('demo.noOrders')}</p>
					<p>{t('demo.purpose')}</p>
				</div>

				<ul role='list' className={style.links}>
					<li>
						<a href={PORTFOLIO_URL} target='_blank' rel='noreferrer' className={style.link}>
							<span>
								<span className={style.linkLabel}>{t('demo.portfolio')}</span>
								<span className={style.linkUrl}>danylodev.com</span>
							</span>
							<ExternalLink size={16} aria-hidden />
						</a>
					</li>
					<li>
						<a href={SOURCE_URL} target='_blank' rel='noreferrer' className={style.link}>
							<span>
								<span className={style.linkLabel}>{t('demo.source')}</span>
								<span className={style.linkUrl}>github.com/danik3422/mern-ecommerce-shop</span>
							</span>
							<ExternalLink size={16} aria-hidden />
						</a>
					</li>
				</ul>

				<p className={style.question}>{t('demo.question')}</p>
				<div className={style.actions}>
					<Button variant='secondary' onClick={onDecline}>
						{t('demo.decline')}
					</Button>
					<Button onClick={onAccept} data-autofocus>
						{t('demo.accept')}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	)
}

export default DemoNotice
