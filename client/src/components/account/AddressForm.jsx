import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import TextField from '../ui/TextField'
import shared from './Account.module.css'
import { useI18n } from '../../i18n/useI18n'

const FIELDS = [
	{ name: 'fullName', autoComplete: 'name', wide: true },
	{ name: 'street', autoComplete: 'street-address', wide: true },
	{ name: 'postalCode', autoComplete: 'postal-code' },
	{ name: 'city', autoComplete: 'address-level2' },
	{ name: 'country', autoComplete: 'country-name', wide: true },
]

const EMPTY = Object.fromEntries(FIELDS.map(({ name }) => [name, '']))

const pickFields = (address) =>
	Object.fromEntries(FIELDS.map(({ name }) => [name, address?.[name] ?? '']))

/**
 * Add/edit form for the address book.
 * @param mutation a TanStack mutation that receives the address fields
 */
const AddressForm = ({ address, mutation, onCancel, submitLabel }) => {
	const { t } = useI18n()
	const [fields, setFields] = useState(() => (address ? pickFields(address) : EMPTY))
	const fieldErrors = getFieldErrors(mutation.error)

	const handleSubmit = (e) => {
		e.preventDefault()
		mutation.mutate(fields)
	}

	return (
		<form className={shared.form} onSubmit={handleSubmit}>
			<div className={shared.formGrid}>
				{FIELDS.map(({ name, autoComplete, wide }) => (
					<TextField
						key={name}
						name={name}
						label={t(`address.${name}`)}
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
					{mutation.isPending ? t('common.saving') : submitLabel}
				</Button>
				<Button variant='ghost' onClick={onCancel}>
					{t('common.cancel')}
				</Button>
			</div>
		</form>
	)
}

export default AddressForm
