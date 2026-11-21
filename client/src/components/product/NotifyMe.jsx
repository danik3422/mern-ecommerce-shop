import { useMutation } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createStockAlert } from '../../api/products'
import { useAuth } from '../../auth/useAuth'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import TextField from '../ui/TextField'
import style from './NotifyMe.module.css'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'

/**
 * "Notify me" for sold-out sizes of the shown color: opens a form that subscribes
 * an email to a back-in-stock alert. Renders nothing when every size is in stock.
 * @param variant the color the customer is looking at
 * @param appearance 'link' (under the size picker) | 'button' (the color is sold out)
 */
const NotifyMe = ({ product, variant, appearance = 'link' }) => {
	const { t, locale } = useI18n()
	const { user } = useAuth()
	const soldOutSizes = variant.sizes.filter((s) => s.stock === 0).map((s) => s.label)
	const [isOpen, setIsOpen] = useState(false)
	const [size, setSize] = useState(soldOutSizes[0])
	const [email, setEmail] = useState(user?.email ?? '')
	// the email comes in the language the visitor is using now
	const alert = useMutation({
		mutationFn: (body) => createStockAlert(product._id, { ...body, locale }),
	})

	if (!soldOutSizes.length) return null

	const fieldErrors = getFieldErrors(alert.error)
	const isOneSize = variant.sizes.length === 1
	// the product name in the email, with the color when there are several
	const productName = [
		product.brand,
		product.title,
		product.variants.length > 1 && colorName(t, variant.color),
	]
		.filter(Boolean)
		.join(' ')

	const close = () => {
		setIsOpen(false)
		alert.reset()
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		alert.mutate({ color: variant.color, size, email: email.trim() || undefined })
	}

	return (
		<>
			{appearance === 'button' ? (
				<Button variant='secondary' fullWidth onClick={() => setIsOpen(true)}>
					<Bell size={16} aria-hidden /> {t('notify.button')}
				</Button>
			) : (
				<button type='button' className={style.link} onClick={() => setIsOpen(true)}>
					<Bell size={14} aria-hidden /> {t('notify.link')}
				</button>
			)}

			{isOpen && (
				<Modal title={t('notify.title')} onClose={close}>
					{alert.isSuccess ? (
						<div className={style.done}>
							<Alert tone='success'>
								{t(isOneSize ? 'notify.done' : 'notify.doneSize', {
									email: email.trim() || user?.email,
									size,
								})}
							</Alert>
							<Button variant='secondary' onClick={close}>
								{t('common.close')}
							</Button>
						</div>
					) : (
						<form className={style.form} onSubmit={handleSubmit}>
							<p className={style.lead}>
								{t(isOneSize ? 'notify.lead' : 'notify.leadSize', { product: productName })}
							</p>
							{!isOneSize && (
								<Select
									label={t('notify.size')}
									value={size}
									onChange={(e) => setSize(e.target.value)}
									options={soldOutSizes.map((label) => ({ value: label, label }))}
								/>
							)}
							<TextField
								label={t('notify.email')}
								type='email'
								autoComplete='email'
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								error={fieldErrors.email}
								required
							/>
							{alert.isError && !fieldErrors.email && (
								<Alert tone='error'>{getErrorMessage(alert.error)}</Alert>
							)}
							<Button type='submit' fullWidth disabled={alert.isPending}>
								{alert.isPending ? t('notify.saving') : t('notify.submit')}
							</Button>
						</form>
					)}
				</Modal>
			)}
		</>
	)
}

export default NotifyMe
