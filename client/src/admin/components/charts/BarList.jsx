import { cx } from '../../../utils/cx'
import style from './BarList.module.css'

/**
 * A ranked list with a thin bar per row — readable as plain text, so the bars are decorative.
 * @param items `[{ key, label, value: string, amount: number, detail?: string }]` —
 *   bar length is `amount` relative to the largest one
 * @param empty message when there are no items
 */
const BarList = ({ items, label, empty = 'No data for this period.', className }) => {
	if (!items.length) return <p className={style.empty}>{empty}</p>
	const max = Math.max(...items.map((item) => item.amount), 0) || 1

	return (
		<ul role='list' className={cx(style.list, className)} aria-label={label}>
			{items.map((item) => (
				<li key={item.key} className={style.row}>
					<div className={style.text}>
						<span className={style.label}>{item.label}</span>
						<span className={style.value}>
							{item.value}
							{item.detail && <span className={style.detail}>{item.detail}</span>}
						</span>
					</div>
					<span className={style.track} aria-hidden>
						<span className={style.bar} style={{ width: `${(item.amount / max) * 100}%` }} />
					</span>
				</li>
			))}
		</ul>
	)
}

export default BarList
