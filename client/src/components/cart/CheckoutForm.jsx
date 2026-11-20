import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createOrder } from '../../api/orders'
import { toApiItems } from '../../cart/cartLines'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import style from './CheckoutForm.module.css'

const FIELDS = [
	{ name: 'fullName', label: 'Full name', autoComplete: 'name' },
	{ name: 'street', label: 'Street and house number', autoComplete: 'street-address' },
	{ name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
	{ name: 'city', label: 'City', autoComplete: 'address-level2' },
	{ name: 'country', label: 'Country', autoComplete: 'country-name' },
]

const EMPTY_ADDRESS = Object.fromEntries(FIELDS.map(({ name }) => [name, '']))

/**
 * Collects the shipping address and places the order.
 * @param lines cart lines to order
 * @param disabled e.g. when some items are sold out
 * @param onOrderPlaced called with the created order
 */
const CheckoutForm = ({ lines, disabled, onOrderPlaced }) => {
	const [address, setAddress] = useState(EMPTY_ADDRESS)
	const order = useMutation({ mutationFn: createOrder, onSuccess: onOrderPlaced })
	const fieldErrors = getFieldErrors(order.error)

	const handleChange = (e) => setAddress({ ...address, [e.target.name]: e.target.value })

	const handleSubmit = (e) => {
		e.preventDefault()
		order.mutate({ items: toApiItems(lines), address })
	}

	return (
		<form className={style.form} onSubmit={handleSubmit}>
			<fieldset className={style.fieldset}>
				<legend className={style.legend}>Shipping address</legend>
				<div className={style.fields}>
					{FIELDS.map(({ name, label, autoComplete }) => (
						<TextField
							key={name}
							name={name}
							label={label}
							autoComplete={autoComplete}
							value={address[name]}
							onChange={handleChange}
							error={fieldErrors[`address.${name}`]}
							className={style[name]}
							required
						/>
					))}
				</div>
			</fieldset>
			{order.isError && <Alert tone='error'>{getErrorMessage(order.error)}</Alert>}
			<Button type='submit' fullWidth disabled={disabled || order.isPending}>
				{order.isPending ? 'Placing order…' : 'Place order'}
			</Button>
		</form>
	)
}

export default CheckoutForm
