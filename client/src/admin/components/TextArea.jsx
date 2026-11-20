import { useId } from 'react'
import field from '../../components/ui/Field.module.css'
import { cx } from '../../utils/cx'
import style from './FormParts.module.css'

/** A labelled multi-line field with an optional error, styled like TextField. */
const TextArea = ({ label, error, className, rows = 5, ...props }) => {
	const id = useId()
	return (
		<div className={cx(field.field, className)}>
			<label className={field.label} htmlFor={id}>
				{label}
			</label>
			<textarea
				id={id}
				rows={rows}
				className={cx(field.control, style.textarea, error && field.invalid)}
				aria-invalid={Boolean(error)}
				aria-describedby={error ? `${id}-error` : undefined}
				{...props}
			/>
			{error && (
				<p id={`${id}-error`} className={field.error}>
					{error}
				</p>
			)}
		</div>
	)
}

export default TextArea
