import { cx } from '../../utils/cx'
import style from './Button.module.css'

/**
 * @param as element or component to render, e.g. `Link` for navigation styled as a button
 * @param variant 'primary' | 'secondary' | 'ghost'
 * @param size 'md' | 'sm'
 */
const Button = ({
	as: Component = 'button',
	variant = 'primary',
	size = 'md',
	fullWidth = false,
	className,
	...props
}) => {
	const defaultProps = Component === 'button' ? { type: 'button' } : {}

	return (
		<Component
			{...defaultProps}
			{...props}
			className={cx(
				style.button,
				style[variant],
				style[size],
				fullWidth && style.fullWidth,
				className,
			)}
		/>
	)
}

export default Button
