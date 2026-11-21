import { ChevronDown, Globe } from 'lucide-react'
import { useId } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './LanguageSwitcher.module.css'

const LANGUAGES = [
	{ value: 'en', label: 'EN', name: 'English' },
	{ value: 'pl', label: 'PL', name: 'Polski' },
]

/**
 * EN/PL language select.
 * @param variant 'compact' — "EN" with a globe, label hidden (header bar);
 *   'field' — visible label and full language names, 44px tall (menu, footer)
 */
const LanguageSwitcher = ({ className, variant = 'compact' }) => {
	const { locale, setLocale, t } = useI18n()
	const id = useId()
	const isField = variant === 'field'

	return (
		<div className={cx(style.switcher, isField && style.field, className)}>
			<label htmlFor={id} className={isField ? style.label : 'visually-hidden'}>
				{t('layout.language')}
			</label>
			<span className={style.control}>
				<Globe size={16} aria-hidden className={style.icon} />
				<select
					id={id}
					className={style.select}
					value={locale}
					onChange={(e) => setLocale(e.target.value)}
				>
					{LANGUAGES.map((language) => (
						<option key={language.value} value={language.value} aria-label={language.name}>
							{isField ? language.name : language.label}
						</option>
					))}
				</select>
				{isField && <ChevronDown size={16} aria-hidden className={style.chevron} />}
			</span>
		</div>
	)
}

export default LanguageSwitcher
