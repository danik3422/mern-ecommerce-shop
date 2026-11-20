import { useMutation } from '@tanstack/react-query'
import { Tag, X } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { fetchQuote } from '../../api/shop'
import { toApiItems } from '../../cart/cartLines'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import style from './PromoCodeField.module.css'

/**
 * Promo code input. "Apply" checks the code with the server first, so the reason
 * why a code cannot be used appears right under the field.
 * @param appliedCode the code currently used for the totals, or null
 * @param onApply called with the normalised code, or null to remove it
 * @param notice a message to show, e.g. why an applied code was removed
 */
const PromoCodeField = ({ lines, shippingMethod, appliedCode, onApply, notice }) => {
	const [code, setCode] = useState('')
	const check = useMutation({
		mutationFn: (promoCode) => fetchQuote({ items: toApiItems(lines), shippingMethod, promoCode }),
		onSuccess: (quote) => {
			onApply(quote.promo.code)
			setCode('')
		},
	})

	if (appliedCode) {
		return (
			<div className={style.applied}>
				<Tag size={16} aria-hidden />
				<span>
					Code <strong>{appliedCode}</strong> applied
				</span>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => onApply(null)}
					aria-label='Remove promo code'
				>
					<X size={16} aria-hidden />
				</Button>
			</div>
		)
	}

	const error = check.isError
		? (getFieldErrors(check.error).promoCode ?? getErrorMessage(check.error))
		: notice

	return (
		<form
			className={style.form}
			onSubmit={(e) => {
				e.preventDefault()
				if (code.trim()) check.mutate(code.trim())
			}}
		>
			<TextField
				label='Promo code'
				value={code}
				onChange={(e) => {
					setCode(e.target.value)
					check.reset()
				}}
				error={error}
				autoComplete='off'
				className={style.field}
			/>
			<Button type='submit' variant='secondary' disabled={!code.trim() || check.isPending}>
				Apply
			</Button>
		</form>
	)
}

export default PromoCodeField
