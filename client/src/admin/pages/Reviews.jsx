import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { Link } from 'react-router'
import { adminKeys, deleteReview, fetchAdminReviews } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast/useToast'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import table from '../components/Table.module.css'
import { formatDate } from '../format'
import { useAdminConfirm } from '../useAdminConfirm'
import { useListParams } from '../useListParams'
import style from './Reviews.module.css'

const PAGE_SIZE = 20

const Reviews = () => {
	const queryClient = useQueryClient()
	const toast = useToast()
	const confirm = useAdminConfirm()
	const { params, setPage } = useListParams({})
	const query = { ...params, limit: PAGE_SIZE }

	const reviews = useQuery({
		queryKey: adminKeys.reviews(query),
		queryFn: ({ signal }) => fetchAdminReviews(query, signal),
		placeholderData: keepPreviousData,
	})
	const remove = useMutation({
		mutationFn: (review) => deleteReview(review.product?._id ?? review.product, review._id),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: adminKeys.all }),
				queryClient.invalidateQueries({ queryKey: ['reviews'] }),
				queryClient.invalidateQueries({ queryKey: ['products'] }),
			]).then(() => toast.show({ tone: 'success', message: 'Review deleted' })),
		onError: (error) =>
			toast.show({
				tone: 'error',
				title: 'Could not delete the review',
				message: getErrorMessage(error),
			}),
	})

	const handleDelete = async (review) => {
		const confirmed = await confirm({
			title: 'Delete review?',
			message: `The review by ${review.username} disappears from the shop and the product rating is recalculated.`,
			confirmLabel: 'Delete review',
			tone: 'danger',
		})
		if (confirmed) remove.mutate(review)
	}

	return (
		<>
			<PageHeader title='Reviews' description='Newest customer reviews. Remove spam or abuse.' />
			<QueryState query={reviews} label='reviews'>
				{(data) => (
					<>
						{data.items.length ? (
							<ul role='list' className={style.list}>
								{data.items.map((review) => (
									<li key={review._id} className={`${table.panel} ${style.review}`}>
										<div className={style.meta}>
											<span className={style.rating} aria-label={`${review.rating} out of 5 stars`}>
												<Star size={14} aria-hidden className={style.star} /> {review.rating}/5
											</span>
											<span>
												by <strong>{review.username}</strong> on {formatDate(review.createdAt)}
											</span>
											{review.product ? (
												<Link to={`/admin/products/${review.product._id}`} className='text-link'>
													{review.product.title}
												</Link>
											) : (
												<span className={table.muted}>Deleted product</span>
											)}
										</div>
										{review.title && <h2 className={style.title}>{review.title}</h2>}
										<p className={style.body}>{review.body}</p>
										<div>
											<Button
												variant='secondary'
												size='sm'
												onClick={() => handleDelete(review)}
												disabled={remove.isPending}
											>
												Delete review
											</Button>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className={`${table.panel} ${table.empty}`}>No reviews yet.</p>
						)}
						<Pager {...data} limit={PAGE_SIZE} onChange={setPage} />
					</>
				)}
			</QueryState>
		</>
	)
}

export default Reviews
