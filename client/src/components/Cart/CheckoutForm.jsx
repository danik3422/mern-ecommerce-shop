import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import styled from 'styled-components'
import { getErrorMessage } from '../../api/client'
import { createOrder } from '../../api/orders'
import { toApiItems } from '../../cart/cartLines'

const Form = styled.form`
	display: flex;
	flex-direction: column;
	gap: 10px;
`
const Input = styled.input`
	width: 100%;
	padding: 10px;
	border: 1px solid lightgrey;
`
const SubmitButton = styled.button`
	width: 100%;
	padding: 10px;
	background-color: black;
	color: white;
	font-weight: 600;
	cursor: pointer;

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
`
const Error = styled.p`
	color: crimson;
`

const FIELDS = [
	['fullName', 'Full name', 'name'],
	['street', 'Street and house number', 'street-address'],
	['city', 'City', 'address-level2'],
	['postalCode', 'Postal code', 'postal-code'],
	['country', 'Country', 'country-name'],
]

const EMPTY_ADDRESS = Object.fromEntries(FIELDS.map(([name]) => [name, '']))

/**
 * Collects the shipping address and places the order.
 * @param lines cart lines to order
 * @param disabled e.g. when some items are out of stock
 * @param onOrderPlaced called with the created order
 */
const CheckoutForm = ({ lines, disabled, onOrderPlaced }) => {
	const [address, setAddress] = useState(EMPTY_ADDRESS)
	const order = useMutation({ mutationFn: createOrder, onSuccess: onOrderPlaced })

	const handleChange = (e) => setAddress({ ...address, [e.target.name]: e.target.value })

	const handleSubmit = (e) => {
		e.preventDefault()
		order.mutate({ items: toApiItems(lines), address })
	}

	return (
		<Form onSubmit={handleSubmit}>
			{FIELDS.map(([name, label, autoComplete]) => (
				<label key={name}>
					<span className='visually-hidden'>{label}</span>
					<Input
						name={name}
						placeholder={label}
						autoComplete={autoComplete}
						value={address[name]}
						onChange={handleChange}
						required
					/>
				</label>
			))}
			{order.isError && <Error role='alert'>{getErrorMessage(order.error)}</Error>}
			<SubmitButton disabled={disabled || order.isPending}>
				{order.isPending ? 'Placing order…' : 'Place order'}
			</SubmitButton>
		</Form>
	)
}

export default CheckoutForm
