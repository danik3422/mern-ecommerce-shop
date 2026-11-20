import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { deleteReview, fetchReviewEligibility, fetchReviews, reviewKeys } from '../../api/reviews'
import { useAuth } from '../../auth/useAuth'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import style from './ProductReviews.module.css'
import RatingStars from './RatingStars'
import ReviewForm from './ReviewForm'
import ReviewItem from './ReviewItem'
import { useI18n } from '../../i18n/useI18n'

const PAGE_SIZE = 5

const RatingSummary = ({ summary }) => {
	const { t } = useI18n()
	return (
		<div className={style.summary}>
			<p className={style.average}>{summary.average.toFixed(1)}</p>
			<RatingStars value={summary.average} count={summary.count} size={16} />
			<ul role='list' className={style.distribution} aria-label={t('reviews.distribution')}>
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
								<span className='visually-hidden'> {t('reviews.withStars', { count, stars })}</span>
							</span>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

/** Rating summary, review list and review form below the product details. */
const ProductReviews = ({ product }) => {
	const { user } = useAuth()
	const { t } = useI18n()
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

	// verified buyers only: the server says whether this customer may write a review
	const eligibility = useQuery({
		queryKey: reviewKeys.eligibility(product._id, user?._id),
		queryFn: ({ signal }) => fetchReviewEligibility(product._id, signal),
		enabled: Boolean(user),
	})
	const canReview = eligibility.data?.canReview ?? false
	const reviewNote = {
		not_purchased: t('reviews.notPurchased'),
		already_reviewed: t('reviews.alreadyReviewed'),
	}[eligibility.data?.reason]

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
					{hasReviews ? t('reviews.titleWithCount', { count: data.total }) : t('reviews.title')}
				</h2>
				{canReview && !isWriting && (
					<Button variant='secondary' size='sm' onClick={() => setIsWriting(true)}>
						{t('reviews.write')}
					</Button>
				)}
				{!user && (
					<Link to='/login' state={{ from: location.pathname }} className='text-link'>
						{t('reviews.signInToWrite')}
					</Link>
				)}
			</div>

			{reviewNote && <p className={style.muted}>{reviewNote}</p>}
			{isWriting && <ReviewForm productId={product._id} onDone={() => setIsWriting(false)} />}

			{reviews.isPending && <p className={style.muted}>{t('reviews.loading')}</p>}
			{reviews.isError && (
				<Alert tone='error'>
					{t('reviews.loadError', { error: getErrorMessage(reviews.error) })}
				</Alert>
			)}
			{removal.isError && <Alert tone='error'>{getErrorMessage(removal.error)}</Alert>}

			{data && !hasReviews && <p className={style.muted}>{t('reviews.empty')}</p>}

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
							<nav className={style.pager} aria-label={t('reviews.pages')}>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setPage(page - 1)}
									disabled={page <= 1}
								>
									{t('reviews.newer')}
								</Button>
								<span className={style.muted}>
									{t('reviews.page', { page: data.page, pages: data.pages })}
								</span>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => setPage(page + 1)}
									disabled={page >= data.pages}
								>
									{t('reviews.older')}
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
