import { capitalize } from '../../utils/text'
import { cx } from '../../utils/cx'
import style from './StatusBadge.module.css'

/** Order status ("pending", "paid", ...) or product visibility ("active", "hidden"). */
const StatusBadge = ({ status }) => (
	<span className={cx(style.badge, style[status])}>{capitalize(status)}</span>
)

export default StatusBadge
