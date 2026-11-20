import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import shared from './Account.module.css'

const FIELDS = [
	{ name: 'fullName', label: 'Full name', autoComplete: 'name', wide: true },
	{ name: 'street', label: 'Street and house number', autoComplete: 'street-address', wide: true },
	{ name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
	{ name: 'city', label: 'City', autoComplete: 'address-level2' },
	{ name: 'country', label: 'Country', autoComplete: 'country-name', wide: true },
]

const EMPTY = Object.fromEntries(FIELDS.map(({ name }) => [name, '']))

const pickFields = (address) =>
	Object.fromEntries(FIELDS.map(({ name }) => [name, address?.[name] ?? '']))

/**
 * Add/edit form for the address book.
 * @param mutation a TanStack mutation that receives the address fields
 */
const AddressForm = ({ address, mutation, onCancel, submitLabel }) => {
	const [fields, setFields] = useState(() => (address ? pickFields(address) : EMPTY))
	const fieldErrors = getFieldErrors(mutation.error)

	const handleSubmit = (e) => {
		e.preventDefault()
		mutation.mutate(fields)
	}

	return (
		<form className={shared.form} onSubmit={handleSubmit}>
			<div className={shared.formGrid}>
				{FIELDS.map(({ name, label, autoComplete, wide }) => (
					<TextField
						key={name}
						name={name}
						label={label}
						autoComplete={autoComplete}
						value={fields[name]}
						onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
						error={fieldErrors[name]}
						className={wide ? shared.wide : undefined}
						required
					/>
				))}
			</div>
			{mutation.isError && !Object.keys(fieldErrors).length && (
				<Alert tone='error'>{getErrorMessage(mutation.error)}</Alert>
			)}
			<div className={shared.actions}>
				<Button type='submit' disabled={mutation.isPending}>
					{mutation.isPending ? 'Saving…' : submitLabel}
				</Button>
				<Button variant='ghost' onClick={onCancel}>
					Cancel
				</Button>
			</div>
		</form>
	)
}

export default AddressForm
