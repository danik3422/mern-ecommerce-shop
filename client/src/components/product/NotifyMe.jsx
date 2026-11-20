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

/**
 * "Notify me" for sold-out sizes of the shown color: opens a form that subscribes
 * an email to a back-in-stock alert. Renders nothing when every size is in stock.
 * @param variant the color the customer is looking at
 * @param appearance 'link' (under the size picker) | 'button' (the color is sold out)
 */
const NotifyMe = ({ product, variant, appearance = 'link' }) => {
	const { user } = useAuth()
	const soldOutSizes = variant.sizes.filter((s) => s.stock === 0).map((s) => s.label)
	const [isOpen, setIsOpen] = useState(false)
	const [size, setSize] = useState(soldOutSizes[0])
	const [email, setEmail] = useState(user?.email ?? '')
	const alert = useMutation({ mutationFn: (body) => createStockAlert(product._id, body) })

	if (!soldOutSizes.length) return null

	const fieldErrors = getFieldErrors(alert.error)
	const isOneSize = variant.sizes.length === 1
	const colorName = product.variants.length > 1 ? ` in ${variant.color}` : ''

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
					<Bell size={16} aria-hidden /> Notify me when it&apos;s back
				</Button>
			) : (
				<button type='button' className={style.link} onClick={() => setIsOpen(true)}>
					<Bell size={14} aria-hidden /> Size sold out? Get notified
				</button>
			)}

			{isOpen && (
				<Modal title='Get notified when it’s back' onClose={close}>
					{alert.isSuccess ? (
						<div className={style.done}>
							<Alert tone='success'>{alert.data.message}.</Alert>
							<Button variant='secondary' onClick={close}>
								Close
							</Button>
						</div>
					) : (
						<form className={style.form} onSubmit={handleSubmit}>
							<p className={style.lead}>
								We will send one email as soon as{' '}
								<strong>
									{product.brand} {product.title}
									{colorName}
								</strong>{' '}
								{isOneSize ? 'is' : 'in your size is'} available again.
							</p>
							{!isOneSize && (
								<Select
									label='Size'
									value={size}
									onChange={(e) => setSize(e.target.value)}
									options={soldOutSizes.map((label) => ({ value: label, label }))}
								/>
							)}
							<TextField
								label='Email'
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
								{alert.isPending ? 'Saving…' : 'Notify me'}
							</Button>
						</form>
					)}
				</Modal>
			)}
		</>
	)
}

export default NotifyMe
