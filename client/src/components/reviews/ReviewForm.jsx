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
import { useI18n } from '../../i18n/useI18n'
import { useToast } from '../ui/toast/useToast'

const EMPTY = { rating: 0, title: '', body: '', fit: '', sizeBought: '' }

const FITS = ['small', 'true', 'large']

/** 403 (not a buyer) and 409 (already reviewed) are expected situations, not failures. */
const isExpectedRefusal = (error) => [403, 409].includes(error?.response?.status)

/**
 * @param sizes the product's size labels; with more than one size the form also asks how it
 *   fits and which size was bought (both optional)
 */
const ReviewForm = ({ productId, sizes = [], onDone }) => {
	const queryClient = useQueryClient()
	const { t } = useI18n()
	const bodyId = useId()
	const sizeId = useId()
	const asksFit = sizes.length > 1
	const [form, setForm] = useState(EMPTY)
	const [ratingError, setRatingError] = useState('')

	const toast = useToast()
	const review = useMutation({
		mutationFn: (data) => createReview(productId, data),
		onSuccess: () => {
			setForm(EMPTY)
			toast.show({ tone: 'success', message: t('reviews.posted') })
			// the product's rating changed as well
			queryClient.invalidateQueries({ queryKey: reviewKeys.all(productId) })
			queryClient.invalidateQueries({ queryKey: ['products'] })
			onDone()
		},
	})
	const fieldErrors = getFieldErrors(review.error)

	const handleSubmit = (e) => {
		e.preventDefault()
		if (!form.rating) return setRatingError(t('reviews.chooseRating'))
		setRatingError('')
		// optional fields are sent only when filled in
		const data = Object.fromEntries(
			Object.entries(form).filter(([, value]) =>
				typeof value === 'string' ? value.trim() : value,
			),
		)
		review.mutate(data)
	}

	return (
		<form className={style.form} onSubmit={handleSubmit} aria-label={t('reviews.write')}>
			<StarRatingInput
				value={form.rating}
				onChange={(rating) => setForm({ ...form, rating })}
				error={ratingError || fieldErrors.rating}
			/>
			<TextField
				label={t('reviews.titleField')}
				name='title'
				maxLength={120}
				value={form.title}
				onChange={(e) => setForm({ ...form, title: e.target.value })}
				error={fieldErrors.title}
			/>
			{asksFit && (
				<div className={style.fitFields}>
					<fieldset className={style.fitQuestion}>
						<legend className={fieldStyle.label}>
							{t('reviews.fitQuestion')}{' '}
							<span className={style.optional}>({t('reviews.optional')})</span>
						</legend>
						<div className={style.fitOptions}>
							{FITS.map((fit) => (
								<label key={fit} className={style.fitOption}>
									<input
										type='radio'
										name={`${sizeId}-fit`}
										value={fit}
										checked={form.fit === fit}
										onChange={() => setForm({ ...form, fit })}
										// a second click on the chosen answer clears it
										onClick={() => form.fit === fit && setForm({ ...form, fit: '' })}
										className='visually-hidden'
									/>
									<span className={style.fitPill}>{t(`reviews.fitOptions.${fit}`)}</span>
								</label>
							))}
						</div>
					</fieldset>
					<div className={fieldStyle.field}>
						<label className={fieldStyle.label} htmlFor={sizeId}>
							{t('reviews.sizeBought')}{' '}
							<span className={style.optional}>({t('reviews.optional')})</span>
						</label>
						<select
							id={sizeId}
							className={`${fieldStyle.control} ${style.sizeSelect}`}
							value={form.sizeBought}
							onChange={(e) => setForm({ ...form, sizeBought: e.target.value })}
							aria-invalid={Boolean(fieldErrors.sizeBought)}
						>
							<option value=''>{t('reviews.chooseSizeBought')}</option>
							{sizes.map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
						{fieldErrors.sizeBought && <p className={fieldStyle.error}>{fieldErrors.sizeBought}</p>}
					</div>
				</div>
			)}
			<div className={fieldStyle.field}>
				<label className={fieldStyle.label} htmlFor={bodyId}>
					{t('reviews.body')}
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
					{review.isPending ? t('reviews.posting') : t('reviews.post')}
				</Button>
				<Button variant='ghost' onClick={onDone}>
					{t('common.cancel')}
				</Button>
			</div>
		</form>
	)
}

export default ReviewForm
