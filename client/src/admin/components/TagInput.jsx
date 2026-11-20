import { X } from 'lucide-react'
import { useId, useState } from 'react'
import field from '../../components/ui/Field.module.css'
import style from './FormParts.module.css'

/**
 * Editable list of lowercase tags (categories, colors).
 * Enter or comma adds the typed tag, Backspace in an empty field removes the last one.
 */
const TagInput = ({ label, values, onChange, hint, error, suggestions = [] }) => {
	const id = useId()
	const [text, setText] = useState('')

	const add = (raw) => {
		const tag = raw.trim().toLowerCase()
		if (tag && !values.includes(tag)) onChange([...values, tag])
		setText('')
	}

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault()
			add(text)
		} else if (e.key === 'Backspace' && !text && values.length) {
			onChange(values.slice(0, -1))
		}
	}

	const message = error || hint
	return (
		<div className={field.field}>
			<label className={field.label} htmlFor={id}>
				{label}
			</label>
			<div className={style.tagBox}>
				<ul role='list' className={style.tags}>
					{values.map((tag) => (
						<li key={tag} className={style.tag}>
							{tag}
							<button
								type='button'
								className={style.tagRemove}
								onClick={() => onChange(values.filter((value) => value !== tag))}
								aria-label={`Remove ${tag}`}
							>
								<X size={12} aria-hidden />
							</button>
						</li>
					))}
				</ul>
				<input
					id={id}
					className={style.tagInput}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={() => text && add(text)}
					list={suggestions.length ? `${id}-suggestions` : undefined}
					aria-describedby={message ? `${id}-message` : undefined}
					aria-invalid={Boolean(error)}
				/>
				{suggestions.length > 0 && (
					<datalist id={`${id}-suggestions`}>
						{suggestions.map((suggestion) => (
							<option key={suggestion} value={suggestion} />
						))}
					</datalist>
				)}
			</div>
			{message && (
				<p id={`${id}-message`} className={error ? field.error : field.hint}>
					{message}
				</p>
			)}
		</div>
	)
}

export default TagInput
