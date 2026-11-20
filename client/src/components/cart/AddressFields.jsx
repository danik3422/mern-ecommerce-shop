import { ADDRESS_FIELDS } from '../../cart/address'
import TextField from '../ui/TextField'
import style from './CheckoutForm.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Controlled shipping address inputs.
 * @param errors field errors keyed like the API returns them, e.g. `{ 'address.city': '...' }`
 */
const AddressFields = ({ value, onChange, errors = {} }) => {
	const { t } = useI18n()
	const handleChange = (e) => onChange({ ...value, [e.target.name]: e.target.value })

	return (
		<div className={style.fields}>
			{ADDRESS_FIELDS.map(({ name, labelKey, autoComplete }) => (
				<TextField
					key={name}
					name={name}
					label={t(labelKey)}
					autoComplete={autoComplete}
					value={value[name]}
					onChange={handleChange}
					error={errors[`address.${name}`]}
					className={style[name]}
					required
				/>
			))}
		</div>
	)
}

export default AddressFields
