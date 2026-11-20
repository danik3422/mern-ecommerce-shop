import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import TextField from '../../components/ui/TextField'
import { PROMO_TYPE_LABELS, emptyPromoForm, formToPromo } from '../promoForm'
import style from './PromoCodeForm.module.css'

const TYPE_OPTIONS = Object.entries(PROMO_TYPE_LABELS).map(([value, label]) => ({ value, label }))

/**
 * Create/edit form for a promo code.
 * @param initialValues form values (see promoForm.js); omit for a new code
 * @param mutation the TanStack mutation that saves (pending and error state)
 */
const PromoCodeForm = ({ initialValues, mutation, onSubmit, onCancel }) => {
	const [form, setForm] = useState(() => initialValues ?? emptyPromoForm())
	const errors = getFieldErrors(mutation.error)
	const set = (name) => (e) =>
		setForm({ ...form, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

	const valueLabel = form.type === 'percent' ? 'Percent off' : 'Amount off ($)'

	return (
		<form
			className={style.form}
			onSubmit={(e) => {
				e.preventDefault()
				onSubmit(formToPromo(form))
			}}
			noValidate
		>
			<div className={style.grid}>
				<TextField
					label='Code'
					value={form.code}
					onChange={set('code')}
					error={errors.code}
					hint='Customers type it in any case'
					required
				/>
				<Select label='Discount' value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
				{form.type !== 'free_shipping' && (
					<TextField
						label={valueLabel}
						type='number'
						min='0'
						step='0.01'
						inputMode='decimal'
						value={form.value}
						onChange={set('value')}
						error={errors.value}
						required
					/>
				)}
				<TextField
					label='Minimum order ($)'
					type='number'
					min='0'
					step='0.01'
					inputMode='decimal'
					value={form.minSubtotal}
					onChange={set('minSubtotal')}
					error={errors.minSubtotal}
				/>
				<TextField
					label='Starts'
					type='date'
					value={form.startsAt}
					onChange={set('startsAt')}
					error={errors.startsAt}
				/>
				<TextField
					label='Ends'
					type='date'
					value={form.endsAt}
					onChange={set('endsAt')}
					error={errors.endsAt}
				/>
				<TextField
					label='Usage limit'
					type='number'
					min='1'
					step='1'
					value={form.maxUses}
					onChange={set('maxUses')}
					error={errors.maxUses}
					hint='Empty for unlimited'
				/>
				<TextField
					label='Description'
					value={form.description}
					onChange={set('description')}
					error={errors.description}
					hint='Shown to customers when the code is applied'
					className={style.wide}
				/>
			</div>
			<label className={style.toggle}>
				<input type='checkbox' checked={form.active} onChange={set('active')} /> Active
			</label>
			{mutation.isError && !Object.keys(errors).length && (
				<Alert tone='error'>{getErrorMessage(mutation.error)}</Alert>
			)}
			<div className={style.actions}>
				<Button variant='secondary' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' disabled={mutation.isPending}>
					{mutation.isPending ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</form>
	)
}

export default PromoCodeForm
