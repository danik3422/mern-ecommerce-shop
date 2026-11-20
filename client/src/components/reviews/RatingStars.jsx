import { Star } from 'lucide-react'
import style from './RatingStars.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Read-only star rating, e.g. on product cards: ★★★★☆ (12)
 * @param value average rating 0..5
 * @param count number of reviews; nothing is rendered when there are none
 */
const RatingStars = ({ value, count, size = 14 }) => {
	const { t } = useI18n()
	if (!count) return null
	const rounded = Math.round(value * 2) / 2

	return (
		<p className={style.rating}>
			<span className='visually-hidden'>
				{t('reviews.ratedSummary', { rating: value.toFixed(1), count })}
			</span>
			<span className={style.stars} aria-hidden>
				{[1, 2, 3, 4, 5].map((n) => (
					<Star
						key={n}
						size={size}
						className={n <= rounded ? style.filled : n - 0.5 === rounded ? style.half : style.empty}
					/>
				))}
			</span>
			<span className={style.count} aria-hidden>
				({count})
			</span>
		</p>
	)
}

export default RatingStars
