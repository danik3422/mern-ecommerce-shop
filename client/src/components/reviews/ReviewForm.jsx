import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createReview, reviewKeys } from '../../api/reviews'
import fieldStyle from '../ui/Field.module.css'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import style from './ProductReviews.module.css'
import StarRatingInput from './StarRatingInput'

const EMPTY = { rating: 0, title: '', body: '' }

/** 403 (not a buyer) and 409 (already reviewed) are expected situations, not failures. */
const isExpectedRefusal = (error) => [403, 409].includes(error?.response?.status)

const ReviewForm = ({ productId, onDone }) => {
	const queryClient = useQueryClient()
	const bodyId = useId()
	const [form, setForm] = useState(EMPTY)
	const [ratingError, setRatingError] = useState('')

	const review = useMutation({
		mutationFn: (data) => createReview(productId, data),
		onSuccess: () => {
			setForm(EMPTY)
			// the product's rating changed as well
			queryClient.invalidateQueries({ queryKey: reviewKeys.all(productId) })
			queryClient.invalidateQueries({ queryKey: ['products'] })
			onDone()
		},
	})
	const fieldErrors = getFieldErrors(review.error)

	const handleSubmit = (e) => {
		e.preventDefault()
		if (!form.rating) return setRatingError('Choose a rating from 1 to 5')
		setRatingError('')
		const { title, ...rest } = form
		review.mutate(title.trim() ? { ...rest, title } : rest)
	}

	return (
		<form className={style.form} onSubmit={handleSubmit} aria-label='Write a review'>
			<StarRatingInput
				value={form.rating}
				onChange={(rating) => setForm({ ...form, rating })}
				error={ratingError || fieldErrors.rating}
			/>
			<TextField
				label='Title (optional)'
				name='title'
				maxLength={120}
				value={form.title}
				onChange={(e) => setForm({ ...form, title: e.target.value })}
				error={fieldErrors.title}
			/>
			<div className={fieldStyle.field}>
				<label className={fieldStyle.label} htmlFor={bodyId}>
					Your review
				</label>
				<textarea
					id={bodyId}
					className={`${fieldStyle.control} ${style.textarea}`}
					rows={4}
					minLength={10}
					maxLength={2000}
					required
					value={form.body}
					onChange={(e) => setForm({ ...form, body: e.target.value })}
					aria-invalid={Boolean(fieldErrors.body)}
					aria-describedby={fieldErrors.body ? `${bodyId}-error` : undefined}
				/>
				{fieldErrors.body && (
					<p id={`${bodyId}-error`} className={fieldStyle.error}>
						{fieldErrors.body}
					</p>
				)}
			</div>

			{review.isError && !Object.keys(fieldErrors).length && (
				<Alert tone={isExpectedRefusal(review.error) ? 'info' : 'error'}>
					{getErrorMessage(review.error)}
				</Alert>
			)}

			<div className={style.formActions}>
				<Button type='submit' disabled={review.isPending}>
					{review.isPending ? 'Posting…' : 'Post review'}
				</Button>
				<Button variant='ghost' onClick={onDone}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export default ReviewForm
