import { useId } from 'react'
import { cx } from '../../utils/cx'
import style from './Field.module.css'

/** A labelled input with an optional hint and error message. */
const TextField = ({ label, error, hint, className, id, ...inputProps }) => {
	const generatedId = useId()
	const inputId = id ?? generatedId
	const messageId = `${inputId}-message`
	const message = error || hint

	return (
		<div className={cx(style.field, className)}>
			<label className={style.label} htmlFor={inputId}>
				{label}
			</label>
			<input
				id={inputId}
				className={cx(style.control, error && style.invalid)}
				aria-invalid={Boolean(error)}
				aria-describedby={message ? messageId : undefined}
				{...inputProps}
			/>
			{message && (
				<p id={messageId} className={error ? style.error : style.hint}>
					{message}
				</p>
			)}
		</div>
	)
}

export default TextField
