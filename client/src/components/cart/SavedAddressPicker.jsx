import { NEW_ADDRESS } from '../../cart/address'
import { cx } from '../../utils/cx'
import style from './SavedAddressPicker.module.css'

const formatAddress = (address) =>
	[address.street, `${address.postalCode} ${address.city}`, address.country].join(', ')

/**
 * Radio list of the customer's saved addresses plus "Use a new address".
 * @param value the selected address id or NEW_ADDRESS
 */
const SavedAddressPicker = ({ addresses, value, onChange }) => (
	<div className={style.list} role='radiogroup' aria-label='Shipping address'>
		{[...addresses, null].map((address) => {
			const id = address?._id ?? NEW_ADDRESS
			const checked = value === id
			return (
				<label key={id} className={cx(style.option, checked && style.checked)}>
					<input
						type='radio'
						name='shippingAddress'
						value={id}
						checked={checked}
						onChange={() => onChange(id)}
						className={style.radio}
					/>
					{address ? (
						<span className={style.text}>
							<span className={style.name}>
								{address.fullName}
								{address.isDefault && <span className={style.badge}>Default</span>}
							</span>
							<span className={style.muted}>{formatAddress(address)}</span>
						</span>
					) : (
						<span className={style.name}>Use a new address</span>
					)}
				</label>
			)
		})}
	</div>
)

export default SavedAddressPicker
