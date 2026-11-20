import { useMutation } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { requestReturn } from '../../api/orders'
import { useShopConfig } from '../../hooks/useShopConfig'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { RETURN_REASONS, canRequestReturn, returnDeadline } from './returns'
import style from './ReturnSection.module.css'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'

/**
 * Return status of an order, or a "Return items" button while the order can be returned.
 * @param token guest order token, if any
 * @param onChange called with the updated order after a return was requested
 */
const ReturnSection = ({ order, token, onChange }) => {
	const config = useShopConfig()
	const { t, formatDate, formatMoney } = useI18n()
	const [isOpen, setIsOpen] = useState(false)
	const request = order.returnRequest

	if (request) {
		return (
			<Alert tone={request.status === 'rejected' ? 'error' : 'info'} className={style.status}>
				<RotateCcw size={16} aria-hidden />
				<span>
					{t(`returns.status.${request.status}`)}{' '}
					{request.status === 'refunded' &&
						t('returns.refunded', { amount: formatMoney(request.refundAmount) })}
					{request.note && (
						<span className={style.note}> {t('returns.shopNote', { note: request.note })}</span>
					)}
				</span>
			</Alert>
		)
	}

	if (!config || !canRequestReturn(order, config.returnWindowDays)) return null
	const deadline = returnDeadline(order, config.returnWindowDays)

	return (
		<>
			<p className={style.hint}>
				<Button variant='secondary' size='sm' onClick={() => setIsOpen(true)}>
					<RotateCcw size={14} aria-hidden /> {t('returns.button')}
				</Button>
				<span>{t('returns.freeUntil', { date: formatDate(deadline) })}</span>
			</p>
			{isOpen && (
				<Modal title={t('returns.title')} onClose={() => setIsOpen(false)}>
					<ReturnForm
						order={order}
						token={token}
						onDone={(updated) => {
							setIsOpen(false)
							onChange?.(updated)
						}}
					/>
				</Modal>
			)}
		</>
	)
}

const ReturnForm = ({ order, token, onDone }) => {
	const { t, formatMoney } = useI18n()
	// quantity to return per order line (0 = keep)
	const [quantities, setQuantities] = useState(() => order.items.map(() => 0))
	const [reason, setReason] = useState(RETURN_REASONS[0].value)
	const [comment, setComment] = useState('')
	const submit = useMutation({
		mutationFn: (body) => requestReturn(order._id, body, token),
		onSuccess: onDone,
	})

	const chosen = order.items
		.map((item, index) => ({ item, quantity: quantities[index] }))
		.filter(({ quantity }) => quantity > 0)
	const setQuantity = (index, quantity) =>
		setQuantities((current) => current.map((q, i) => (i === index ? quantity : q)))

	const handleSubmit = (e) => {
		e.preventDefault()
		submit.mutate({
			items: chosen.map(({ item, quantity }) => ({
				productId: item.productId,
				color: item.color,
				size: item.size,
				quantity,
			})),
			reason,
			comment: comment.trim() || undefined,
		})
	}

	const fieldErrors = getFieldErrors(submit.error)

	return (
		<form className={style.form} onSubmit={handleSubmit}>
			<fieldset className={style.fieldset}>
				<legend className={style.legend}>{t('returns.which')}</legend>
				<ul role='list' className={style.items}>
					{order.items.map((item, index) => (
						<li key={index} className={style.item}>
							<img src={item.image} alt='' className={style.image} />
							<span className={style.title}>
								{item.brand} {item.title}
								<span className={style.meta}>
									{[item.color && colorName(t, item.color), item.size, formatMoney(item.price)]
										.filter(Boolean)
										.join(' · ')}
								</span>
							</span>
							<Select
								label={t('returns.quantityOf', { title: item.title })}
								hideLabel
								value={String(quantities[index])}
								onChange={(e) => setQuantity(index, Number(e.target.value))}
								options={Array.from({ length: item.quantity + 1 }, (_, q) => ({
									value: String(q),
									label: q === 0 ? t('returns.keep') : t('returns.returnCount', { count: q }),
								}))}
								className={style.quantity}
							/>
						</li>
					))}
				</ul>
			</fieldset>
			<Select
				label={t('returns.reason')}
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				options={RETURN_REASONS.map(({ value }) => ({
					value,
					label: t(`returns.reasons.${value}`),
				}))}
			/>
			<label className={style.commentLabel}>
				{t('returns.comment')}
				<textarea
					className={style.comment}
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					maxLength={500}
					rows={3}
				/>
			</label>
			{submit.isError && (
				<Alert tone='error'>{Object.values(fieldErrors)[0] ?? getErrorMessage(submit.error)}</Alert>
			)}
			<Button type='submit' fullWidth disabled={!chosen.length || submit.isPending}>
				{submit.isPending ? t('returns.sending') : t('returns.submit')}
			</Button>
		</form>
	)
}

export default ReturnSection
