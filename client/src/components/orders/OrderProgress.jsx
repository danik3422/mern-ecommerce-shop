import { ExternalLink, FileText, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { invoicePath } from '../../api/orders'
import { useI18n } from '../../i18n/useI18n'
import { INTL_LOCALES } from '../../i18n/translate'
import { cx } from '../../utils/cx'
import style from './OrderProgress.module.css'
import { buildTimeline } from './timeline'

const intlLocale = (locale) => INTL_LOCALES[locale] ?? 'en-GB'

/** "21 Nov 2026, 14:05" in the shop language. */
const useDateTime = () => {
	const { locale } = useI18n()
	const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
		dateStyle: 'medium',
		timeStyle: 'short',
	})
	return (value) => formatter.format(new Date(value))
}

/** "Mon, 23 Nov – Wed, 25 Nov" from YYYY-MM-DD days (calendar days, so formatted in UTC). */
const formatDayRange = (locale, { from, to }) => {
	const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	})
	const start = new Date(`${from}T00:00:00Z`)
	const end = new Date(`${to}T00:00:00Z`)
	return from === to ? formatter.format(start) : formatter.formatRange(start, end)
}

/** Carrier, number and a link to the carrier's tracking page. */
export const ParcelInfo = ({ tracking }) => {
	const { t } = useI18n()
	const carrier = t(`tracking.carriers.${tracking.carrier}`, { defaultValue: tracking.carrier })
	return (
		<div className={style.parcel}>
			<p>
				<Truck size={16} aria-hidden className={style.parcelIcon} />
				<span className={style.parcelText}>
					<span className={style.carrier}>{carrier}</span>
					<span className={style.mono}>{tracking.number}</span>
				</span>
			</p>
			{tracking.url && (
				<a
					href={tracking.url}
					target='_blank'
					rel='noopener noreferrer'
					className={style.trackLink}
					aria-label={t('tracking.trackParcelLabel', { number: tracking.number, carrier })}
				>
					{t('tracking.trackParcel')} <ExternalLink size={14} aria-hidden />
				</a>
			)}
		</div>
	)
}

/**
 * Where the order is: a vertical timeline from placing it to delivery (and returns),
 * the expected delivery dates, the parcel and the invoice link.
 * @param token guests' order token, kept in the invoice link
 */
const OrderProgress = ({ order, token }) => {
	const { t, locale } = useI18n()
	const formatDateTime = useDateTime()
	const steps = buildTimeline(order)
	const estimate = order.estimatedDelivery

	return (
		<section className={style.progress} aria-labelledby={`progress-${order._id}`}>
			<h2 id={`progress-${order._id}`} className={style.title}>
				{t('tracking.progress')}
			</h2>

			{estimate && (
				<div className={style.estimate}>
					<p className={style.estimateLabel}>{t('tracking.estimated')}</p>
					<p className={style.estimateDates}>{formatDayRange(locale, estimate)}</p>
					<p className={style.estimateHint}>
						{t('tracking.estimatedHint', {
							from:
								order.status === 'shipped' ? t('tracking.fromShipping') : t('tracking.fromPayment'),
						})}
					</p>
				</div>
			)}

			<ol className={style.timeline}>
				{steps.map((step) => (
					<li
						key={step.key}
						className={cx(
							style.step,
							style[step.state],
							['cancelled', 'returnRejected'].includes(step.key) && style.negative,
						)}
						aria-current={step.state === 'current' ? 'step' : undefined}
					>
						<span className={style.dot} aria-hidden />
						<div className={style.body}>
							<p className={style.label}>
								{t(`tracking.steps.${step.key}`)}
								{step.state === 'current' && (
									<span className='visually-hidden'> ({t('tracking.current')})</span>
								)}
							</p>
							{step.at && (
								<time className={style.time} dateTime={step.at}>
									{formatDateTime(step.at)}
								</time>
							)}
							{step.state === 'current' &&
								t(`tracking.hints.${step.key}`, { defaultValue: '' }) && (
									<p className={style.hint}>{t(`tracking.hints.${step.key}`)}</p>
								)}
							{step.key === 'shipped' && step.state !== 'upcoming' && order.tracking && (
								<ParcelInfo tracking={order.tracking} />
							)}
							{step.key === 'shipped' && step.state === 'upcoming' && order.status === 'paid' && (
								<p className={style.hint}>{t('tracking.parcelPending')}</p>
							)}
						</div>
					</li>
				))}
			</ol>

			{order.invoice?.number && (
				<Link to={invoicePath(order._id, token)} className={style.invoice}>
					<FileText size={18} aria-hidden />
					<span>
						<span className={style.invoiceTitle}>{t('tracking.viewInvoice')}</span>
						<span className={style.invoiceNumber}>{order.invoice.number}</span>
					</span>
				</Link>
			)}
		</section>
	)
}

export default OrderProgress
