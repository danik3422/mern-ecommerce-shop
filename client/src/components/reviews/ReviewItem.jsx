import { Star } from 'lucide-react'
import { cx } from '../../utils/cx'
import Button from '../ui/Button'
import style from './ProductReviews.module.css'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

/** @param canDelete the author or an admin */
const ReviewItem = ({ review, canDelete, onDelete, isDeleting }) => (
	<li className={style.review}>
		<div className={style.reviewHeader}>
			<span className={style.stars} role='img' aria-label={`Rated ${review.rating} out of 5`}>
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
		<p className={style.reviewBody}>{review.body}</p>
		<p className={style.reviewMeta}>
			{review.username} ·{' '}
			<time dateTime={review.createdAt}>{dateFormatter.format(new Date(review.createdAt))}</time>
			{canDelete && (
				<Button variant='ghost' size='sm' onClick={onDelete} disabled={isDeleting}>
					Delete
				</Button>
			)}
		</p>
	</li>
)

export default ReviewItem
