import { Star } from 'lucide-react'
import { cx } from '../../utils/cx'
import style from './StarRatingInput.module.css'

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/**
 * Accessible 1–5 rating: native radio inputs (arrow keys work) drawn as stars.
 * @param value selected rating or 0
 */
const StarRatingInput = ({ value, onChange, error, name = 'rating' }) => (
	<fieldset className={style.fieldset} aria-describedby={error ? `${name}-error` : undefined}>
		<legend className={style.legend}>
			Your rating{value ? <span className={style.hint}> — {LABELS[value - 1]}</span> : null}
		</legend>
		<div className={style.stars}>
			{LABELS.map((label, index) => {
				const rating = index + 1
				return (
					<label key={rating} className={style.star} title={label}>
						<input
							type='radio'
							name={name}
							value={rating}
							checked={value === rating}
							onChange={() => onChange(rating)}
							className='visually-hidden'
							aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'} — ${label}`}
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

export default StarRatingInput
