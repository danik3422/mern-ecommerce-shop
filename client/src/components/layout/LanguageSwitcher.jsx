import { Globe } from 'lucide-react'
import { useId } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './LanguageSwitcher.module.css'

const LANGUAGES = [
	{ value: 'en', label: 'EN', name: 'English' },
	{ value: 'pl', label: 'PL', name: 'Polski' },
]

/** Compact EN/PL language select. */
const LanguageSwitcher = ({ className }) => {
	const { locale, setLocale, t } = useI18n()
	const id = useId()

	return (
		<div className={cx(style.switcher, className)}>
			<label htmlFor={id} className='visually-hidden'>
				{t('layout.language')}
			</label>
			<Globe size={16} aria-hidden className={style.icon} />
			<select
				id={id}
				className={style.select}
				value={locale}
				onChange={(e) => setLocale(e.target.value)}
			>
				{LANGUAGES.map((language) => (
					<option key={language.value} value={language.value} aria-label={language.name}>
						{language.label}
					</option>
				))}
			</select>
		</div>
	)
}

export default LanguageSwitcher
