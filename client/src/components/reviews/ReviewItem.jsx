import { Star } from 'lucide-react'
import { cx } from '../../utils/cx'
import Button from '../ui/Button'
import style from './ProductReviews.module.css'
import { useI18n } from '../../i18n/useI18n'

/** @param canDelete the author or an admin */
const ReviewItem = ({ review, canDelete, onDelete, isDeleting }) => {
	const { t, formatDate } = useI18n()
	return (
		<li className={style.review}>
			<div className={style.reviewHeader}>
				<span
					className={style.stars}
					role='img'
					aria-label={t('reviews.rated', { rating: review.rating })}
				>
					{[1, 2, 3, 4, 5].map((n) => (
						<Star
							key={n}
							size={14}
							aria-hidden
							className={cx(style.star, n <= review.rating && style.starFilled)}
						/>
					))}
				</span>
				{review.title && <h3 className={style.reviewTitle}>{review.title}</h3>}
			</div>
			{(review.sizeBought || review.fit) && (
				<p className={style.reviewFit}>
					{review.sizeBought && <span>{t('reviews.boughtSize', { size: review.sizeBought })}</span>}
					{review.fit && <span>{t(`reviews.fitShort.${review.fit}`)}</span>}
				</p>
			)}
			<p className={style.reviewBody}>{review.body}</p>
			<p className={style.reviewMeta}>
				{review.username} · <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
				{canDelete && (
					<Button variant='ghost' size='sm' onClick={onDelete} disabled={isDeleting}>
						{t('reviews.delete')}
					</Button>
				)}
			</p>
		</li>
	)
}

export default ReviewItem
