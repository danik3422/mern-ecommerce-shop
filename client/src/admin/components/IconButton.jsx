import { cx } from '../../utils/cx'
import style from './IconButton.module.css'

/**
 * Square icon-only button with a tooltip; `label` is also its accessible name.
 * @param as e.g. `Link` or 'a' for navigation
 * @param tone 'default' | 'danger'
 */
const IconButton = ({ as: Component = 'button', label, tone = 'default', className, ...props }) => (
	<Component
		{...(Component === 'button' ? { type: 'button' } : {})}
		aria-label={label}
		title={label}
		{...props}
		className={cx(style.button, tone === 'danger' && style.danger, className)}
	/>
)

export default IconButton
