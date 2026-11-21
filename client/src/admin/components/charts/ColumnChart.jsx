import { formatCount, formatPercent } from './chartFormat'
import style from './ColumnChart.module.css'

/**
 * Small vertical bar chart, e.g. units sold per size. Each column is a list item with
 * its numbers in text, so it reads well without seeing the bars.
 * @param items `[{ key, label, amount, share }]`
 * @param unit e.g. 'units'
 */
const ColumnChart = ({ items, label, unit }) => {
	const max = Math.max(...items.map((item) => item.amount), 0) || 1
	return (
		<ul role='list' className={style.chart} aria-label={label}>
			{items.map((item) => (
				<li key={item.key} className={style.column}>
					<span className={style.share}>{formatPercent(item.share, 0)}</span>
					<span className={style.track} aria-hidden>
						<span className={style.bar} style={{ height: `${(item.amount / max) * 100}%` }} />
					</span>
					<span className={style.label}>{item.label}</span>
					<span className='visually-hidden'>
						: {formatCount(item.amount)} {unit}
					</span>
				</li>
			))}
		</ul>
	)
}

export default ColumnChart
