import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cx } from '../../utils/cx'
import style from './Alert.module.css'

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }

/**
 * A message inside the page — for things that belong to a place, like form errors.
 * Results of actions ("Saved", "Could not delete") are toasts instead (useToast).
 * @param tone 'error' | 'success' | 'info' — errors are announced immediately
 * @param title optional bold first line
 * @param icon false hides the icon, or pass another lucide icon
 */
const Alert = ({ tone = 'info', title, icon, children, className }) => {
	const Icon = icon === false ? null : (icon ?? ICONS[tone])
	return (
		<div
			role={tone === 'error' ? 'alert' : 'status'}
			className={cx(style.alert, style[tone], className)}
		>
			{Icon && <Icon size={18} aria-hidden className={style.icon} />}
			<div className={style.content}>
				{title && <p className={style.title}>{title}</p>}
				{children}
			</div>
		</div>
	)
}

export default Alert
