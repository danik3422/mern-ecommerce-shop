import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { deleteReview, fetchReviews, reviewKeys } from '../../api/reviews'
import { useAuth } from '../../auth/useAuth'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import style from './ProductReviews.module.css'
import RatingStars from './RatingStars'
import ReviewForm from './ReviewForm'
import ReviewItem from './ReviewItem'

const PAGE_SIZE = 5

const RatingSummary = ({ summary }) => (
	<div className={style.summary}>
		<p className={style.average}>{summary.average.toFixed(1)}</p>
		<RatingStars value={summary.average} count={summary.count} size={16} />
		<ul role='list' className={style.distribution} aria-label='Rating distribution'>
			{[5, 4, 3, 2, 1].map((stars) => {
				const count = summary.distribution[stars] ?? 0
				const percent = summary.count ? Math.round((count / summary.count) * 100) : 0
				return (
					<li key={stars} className={style.bar}>
						<span className={style.barLabel}>{stars} ★</span>
						<span className={style.track} aria-hidden>
							<span className={style.fill} style={{ width: `${percent}%` }} />
						</span>
						<span className={style.barCount}>
							{count}
							<span className='visually-hidden'>
								{' '}
								{count === 1 ? 'review' : 'reviews'} with {stars} stars
							</span>
						</span>
					</li>
				)
			})}
		</ul>
	</div>
)

/** Rating summary, review list and review form below the product details. */
const ProductReviews = ({ product }) => {
	const { user } = useAuth()
	const location = useLocation()
	const queryClient = useQueryClient()
	const [page, setPage] = useState(1)
	const [isWriting, setIsWriting] = useState(false)

	const params = { page, limit: PAGE_SIZE }
	const reviews = useQuery({
		queryKey: reviewKeys.list(product._id, params),
		queryFn: ({ signal }) => fetchReviews(product._id, params, signal),
		placeholderData: keepPreviousData,
	})

	const removal = useMutation({
		mutationFn: (reviewId) => deleteReview(product._id, reviewId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reviewKeys.all(product._id) })
			queryClient.invalidateQueries({ queryKey: ['products'] })
		},
	})

	const data = reviews.data
	const hasReviews = data?.total > 0

	return (
		<section className={style.section} aria-labelledby='reviews-title'>
			<div className={style.header}>
				<h2 id='reviews-title' className={style.title}>
					Reviews{hasReviews ? ` (${data.total})` : ''}
				</h2>
				{user && !isWriting && (
					<Button variant='secondary' size='sm' onClick={() => setIsWriting(true)}>
						Write a review
					</Button>
				)}
				{!user && (
					<Link to='/login' state={{ from: location.pathname }} className='text-link'>
						Sign in to write a review
					</Link>
				)}
			</div>

			{isWriting && <ReviewForm productId={product._id} onDone={() => setIsWriting(false)} />}

			{reviews.isPending && <p className={style.muted}>Loading reviews…</p>}
			{reviews.isError && (
				<Alert tone='error'>Could not load reviews: {getErrorMessage(reviews.error)}</Alert>
			)}
			{removal.isError && <Alert tone='error'>{getErrorMessage(removal.error)}</Alert>}

			{data && !hasReviews && (
				<p className={style.muted}>No reviews yet. Bought this item? Tell others what you think.</p>
			)}

			{hasReviews && (
				<div className={style.layout}>
					<RatingSummary summary={data.summary} />
					<div>
						<ul role='list' className={style.list}>
							{data.items.map((review) => (
								<ReviewItem
									key={review._id}
									review={review}
									canDelete={Boolean(user && (user.isAdmin || user._id === review.user))}
									onDelete={() => removal.mutate(review._id)}
									isDeleting={removal.isPending}
								/>
							))}
						</ul>
						{data.pages > 1 && (
							<nav className={style.pager} aria-label='Review pages'>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setPage(page - 1)}
									disabled={page <= 1}
								>
									Newer
								</Button>
								<span className={style.muted}>
									Page {data.page} of {data.pages}
								</span>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setPage(page + 1)}
									disabled={page >= data.pages}
								>
									Older
								</Button>
							</nav>
						)}
					</div>
				</div>
			)}
		</section>
	)
}

export default ProductReviews
