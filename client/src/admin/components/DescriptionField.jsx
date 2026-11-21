import { useId } from 'react'
import field from '../../components/ui/Field.module.css'
import { cx } from '../../utils/cx'
import { DESCRIPTION_LANGUAGES, DESCRIPTION_MAX_LENGTH } from '../productForm'
import TextArea from './TextArea'
import style from './DescriptionField.module.css'

/** "Polish version of: <the start of the English text>" */
const polishPlaceholder = (english) => {
	const text = english.trim()
	return `Polish version of: ${text.length > 80 ? `${text.slice(0, 80)}…` : text}`
}

/**
 * The product description in English and Polish, one tab per language.
 * The Polish tab is marked while it is empty: the shop then shows the English text.
 *
 * @param value `{ en, pl }`
 * @param onChange called with the new `{ en, pl }`
 * @param language the open tab ('en' | 'pl'); the preview follows it, so the form owns it
 * @param errors form errors; `description.en` / `description.pl` are shown under the text
 */
const DescriptionField = ({ value, onChange, language, onLanguageChange, errors }) => {
	const id = useId()
	const missingPolish = !value.pl.trim()
	const current = DESCRIPTION_LANGUAGES.find((lang) => lang.code === language)
	const length = value[language].length

	/** Arrow keys move between the tabs, as in every tab list. */
	const handleKeyDown = (e) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
		const index = DESCRIPTION_LANGUAGES.findIndex((lang) => lang.code === language)
		const next = DESCRIPTION_LANGUAGES[(index + 1) % DESCRIPTION_LANGUAGES.length]
		onLanguageChange(next.code)
		document.getElementById(`${id}-tab-${next.code}`)?.focus()
	}

	return (
		<div className={style.field}>
			<div className={style.header}>
				<span className={field.label} id={`${id}-label`}>
					Description
				</span>
				<div
					className={style.tabs}
					role='tablist'
					aria-labelledby={`${id}-label`}
					onKeyDown={handleKeyDown}
				>
					{DESCRIPTION_LANGUAGES.map(({ code, label }) => {
						const selected = code === language
						const missing = code === 'pl' && missingPolish
						const invalid = Boolean(errors[`description.${code}`])
						return (
							<button
								key={code}
								id={`${id}-tab-${code}`}
								type='button'
								role='tab'
								aria-selected={selected}
								aria-controls={`${id}-panel`}
								tabIndex={selected ? 0 : -1}
								className={cx(style.tab, selected && style.selected, invalid && style.invalid)}
								onClick={() => onLanguageChange(code)}
							>
								{label}
								{code === 'en' && <span className={style.required}> · required</span>}
								{missing && (
									<span className={style.missingDot} title='Missing translation'>
										<span className='visually-hidden'>, missing translation</span>
									</span>
								)}
							</button>
						)
					})}
				</div>
			</div>

			<div id={`${id}-panel`} role='tabpanel' aria-labelledby={`${id}-tab-${language}`}>
				<TextArea
					// a fresh textarea per language keeps undo history apart
					key={language}
					label={`Description (${current.label})`}
					className={style.textField}
					name={`description.${language}`}
					value={value[language]}
					onChange={(e) => onChange({ ...value, [language]: e.target.value })}
					error={errors[`description.${language}`]}
					placeholder={
						language === 'pl' && value.en.trim() ? polishPlaceholder(value.en) : undefined
					}
					required={language === 'en'}
					lang={language}
					maxLength={DESCRIPTION_MAX_LENGTH}
				/>
				<p className={style.counter} aria-live='off'>
					{length} / {DESCRIPTION_MAX_LENGTH}
				</p>
			</div>

			{missingPolish && (
				<p className={style.hint} role='note'>
					<strong>Missing Polish translation.</strong> Polish shoppers see the English text until
					you add it.{' '}
					{language === 'en' && (
						<button type='button' className={style.link} onClick={() => onLanguageChange('pl')}>
							Write it now
						</button>
					)}
				</p>
			)}
		</div>
	)
}

export default DescriptionField
