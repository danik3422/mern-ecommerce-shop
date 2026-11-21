import { cx } from '../../../utils/cx'
import { formatPercent } from './chartFormat'
import style from './KpiCard.module.css'

/**
 * The change vs the previous period as text: relative for money and counts ("12.5%"),
 * in percentage points for rates ("2.1 pts").
 */
const describeChange = ({ kind, value, previous, change }) => {
	if (previous === null) return null
	if (change === null) return value ? { direction: 'up', text: 'New' } : null
	if (Math.abs(change) < 0.0005) return { direction: 'flat', text: 'No change' }
	const amount =
		kind === 'rate'
			? `${(Math.abs(change) * 100).toFixed(1).replace(/\.0$/, '')} pts`
			: formatPercent(Math.abs(change))
	return { direction: change > 0 ? 'up' : 'down', text: amount }
}

/**
 * One headline number with its change vs the previous period (▲/▼).
 * @param kpi `{ kind, value, previous, change }` from the analytics API
 * @param lowerIsBetter colors a rise red, e.g. for the return rate
 */
const KpiCard = ({ label, kpi, format, hint, lowerIsBetter = false }) => {
	const change = describeChange(kpi)
	const good =
		change && change.direction !== 'flat' && (change.direction === 'up') !== lowerIsBetter

	return (
		<div className={style.card}>
			<p className={style.label}>{label}</p>
			<p className={style.value}>{format(kpi.value)}</p>
			<p className={style.footer}>
				{change && (
					<span
						className={cx(
							style.change,
							change.direction === 'flat' ? style.flat : good ? style.good : style.bad,
						)}
					>
						<span aria-hidden>{{ up: '▲', down: '▼', flat: '–' }[change.direction]} </span>
						<span className='visually-hidden'>
							{{ up: 'Up', down: 'Down', flat: '' }[change.direction]}{' '}
						</span>
						{change.text}
					</span>
				)}
				{kpi.previous !== null && (
					<span className={style.previous}>
						{change ? 'vs ' : 'Previous: '}
						{format(kpi.previous)}
					</span>
				)}
			</p>
			{hint && <p className={style.hint}>{hint}</p>}
		</div>
	)
}

export default KpiCard
