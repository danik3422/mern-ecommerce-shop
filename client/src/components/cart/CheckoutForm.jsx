import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { accountKeys, createAddress, fetchAddresses } from '../../api/account'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { createOrder } from '../../api/orders'
import { EMPTY_ADDRESS, NEW_ADDRESS, defaultAddressId, toOrderAddress } from '../../cart/address'
import { toApiItems } from '../../cart/cartLines'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import AddressFields from './AddressFields'
import style from './CheckoutForm.module.css'
import SavedAddressPicker from './SavedAddressPicker'

/**
 * Shipping address (saved or new) and the "Place order" button.
 * @param lines cart lines to order
 * @param disabled e.g. when some items do not have enough stock
 * @param onOrderPlaced called with `{ order, checkoutUrl }`
 */
const CheckoutForm = ({ lines, disabled, onOrderPlaced }) => {
	// the address book may be unavailable — the form then simply asks for a new address
	const savedAddresses = useQuery({
		queryKey: accountKeys.addresses,
		queryFn: fetchAddresses,
		retry: false,
	})
	const addresses = savedAddresses.data ?? []

	const [chosenAddressId, setChosenAddressId] = useState(null)
	const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS)
	const [saveAddress, setSaveAddress] = useState(true)

	// until the customer picks one, the default saved address is used
	const selectedId = chosenAddressId ?? defaultAddressId(addresses)
	const usesNewAddress = selectedId === NEW_ADDRESS

	const order = useMutation({
		mutationFn: async (address) => {
			const result = await createOrder({ items: toApiItems(lines), address })
			if (usesNewAddress && saveAddress) {
				// saving the address must not block a placed order
				await createAddress(address).catch(() => {})
			}
			return result
		},
		onSuccess: (result) => onOrderPlaced(result),
	})
	const fieldErrors = getFieldErrors(order.error)
	const hasAddressErrors =
		usesNewAddress && Object.keys(fieldErrors).some((path) => path.startsWith('address.'))

	const handleSubmit = (e) => {
		e.preventDefault()
		const address = usesNewAddress
			? newAddress
			: toOrderAddress(addresses.find((saved) => saved._id === selectedId))
		order.mutate(address)
	}

	return (
		<form className={style.form} onSubmit={handleSubmit}>
			<fieldset className={style.fieldset}>
				<legend className={style.legend}>Shipping address</legend>
				{savedAddresses.isPending && <p className={style.muted}>Loading your addresses…</p>}
				{addresses.length > 0 && (
					<SavedAddressPicker
						addresses={addresses}
						value={selectedId}
						onChange={setChosenAddressId}
					/>
				)}
				{!savedAddresses.isPending && usesNewAddress && (
					<div className={style.newAddress}>
						<AddressFields value={newAddress} onChange={setNewAddress} errors={fieldErrors} />
						<label className={style.checkbox}>
							<input
								type='checkbox'
								checked={saveAddress}
								onChange={(e) => setSaveAddress(e.target.checked)}
							/>
							Save to my addresses
						</label>
					</div>
				)}
			</fieldset>

			{order.isError && (
				<Alert tone='error'>
					{hasAddressErrors ? 'Please check the highlighted fields.' : getErrorMessage(order.error)}
				</Alert>
			)}
			<Button
				type='submit'
				fullWidth
				disabled={disabled || order.isPending || savedAddresses.isPending}
			>
				{order.isPending ? 'Placing order…' : 'Place order'}
			</Button>
		</form>
	)
}

export default CheckoutForm
