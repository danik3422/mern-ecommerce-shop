import { cx } from '../../utils/cx'
import style from './Alert.module.css'

/** @param tone 'error' | 'success' | 'info' — errors are announced immediately */
const Alert = ({ tone = 'info', children, className }) => (
	<div
		role={tone === 'error' ? 'alert' : 'status'}
		className={cx(style.alert, style[tone], className)}
	>
		{children}
	</div>
)

export default Alert
