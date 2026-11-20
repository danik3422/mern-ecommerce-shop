import { Star } from 'lucide-react'
import { cx } from '../../utils/cx'
import style from './StarRatingInput.module.css'
import { useI18n } from '../../i18n/useI18n'

const RATINGS = [1, 2, 3, 4, 5]

/**
 * Accessible 1–5 rating: native radio inputs (arrow keys work) drawn as stars.
 * @param value selected rating or 0
 */
const StarRatingInput = ({ value, onChange, error, name = 'rating' }) => {
	const { t } = useI18n()
	return (
		<fieldset className={style.fieldset} aria-describedby={error ? `${name}-error` : undefined}>
			<legend className={style.legend}>
				{t('reviews.yourRating')}
				{value ? <span className={style.hint}> — {t(`reviews.labels.${value - 1}`)}</span> : null}
			</legend>
			<div className={style.stars}>
				{RATINGS.map((rating) => {
					const label = t(`reviews.labels.${rating - 1}`)
					return (
						<label key={rating} className={style.star} title={label}>
							<input
								type='radio'
								name={name}
								value={rating}
								checked={value === rating}
								onChange={() => onChange(rating)}
								className='visually-hidden'
								aria-label={`${t('reviews.stars', { count: rating })} — ${label}`}
							/>
							<Star
								size={28}
								aria-hidden
								className={cx(style.icon, rating <= value && style.filled)}
							/>
						</label>
					)
				})}
			</div>
			{error && (
				<p id={`${name}-error`} className={style.error}>
					{error}
				</p>
			)}
		</fieldset>
	)
}

export default StarRatingInput
