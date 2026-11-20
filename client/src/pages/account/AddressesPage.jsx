import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import {
	accountKeys,
	createAddress,
	deleteAddress,
	fetchAddresses,
	updateAddress,
} from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import shared from '../../components/account/Account.module.css'
import AddressForm from '../../components/account/AddressForm'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import style from './AddressesPage.module.css'

const MAX_ADDRESSES = 10

/** `editing`: null — nothing open, 'new' — add form, otherwise the id of the edited address */
const AddressesPage = () => {
	useDocumentTitle('Addresses')
	const { user } = useAuth()
	const queryClient = useQueryClient()
	const [editing, setEditing] = useState(null)

	const queryKey = [...accountKeys.addresses, user._id]
	const addresses = useQuery({ queryKey, queryFn: fetchAddresses })

	const refresh = () => queryClient.invalidateQueries({ queryKey: accountKeys.addresses })
	const closeAndRefresh = () => {
		setEditing(null)
		return refresh()
	}

	const creation = useMutation({
		mutationFn: (fields) => createAddress(fields),
		onSuccess: closeAndRefresh,
	})
	const update = useMutation({
		mutationFn: (fields) => updateAddress(editing, fields),
		onSuccess: closeAndRefresh,
	})
	const makeDefault = useMutation({
		mutationFn: (id) => updateAddress(id, { isDefault: true }),
		onSuccess: refresh,
	})
	const removal = useMutation({ mutationFn: (id) => deleteAddress(id), onSuccess: refresh })

	const handleDelete = (address) => {
		if (window.confirm(`Delete the address of ${address.fullName}, ${address.city}?`)) {
			removal.mutate(address._id)
		}
	}

	const list = addresses.data ?? []
	const canAdd = list.length < MAX_ADDRESSES
	const actionError = makeDefault.error ?? removal.error

	return (
		<section className={shared.section} aria-labelledby='addresses-title'>
			<div className={shared.heading}>
				<h1 id='addresses-title' className={shared.title}>
					Addresses
				</h1>
				{editing !== 'new' && canAdd && (
					<Button variant='secondary' size='sm' onClick={() => setEditing('new')}>
						<Plus size={16} aria-hidden /> Add address
					</Button>
				)}
			</div>

			{addresses.isPending && <p className={shared.muted}>Loading your addresses…</p>}
			{addresses.isError && (
				<Alert tone='error'>
					Could not load your addresses: {getErrorMessage(addresses.error)}
				</Alert>
			)}
			{actionError && <Alert tone='error'>{getErrorMessage(actionError)}</Alert>}

			{editing === 'new' && (
				<div className={shared.card}>
					<h2 className={style.formTitle}>New address</h2>
					<AddressForm
						mutation={creation}
						submitLabel='Save address'
						onCancel={() => setEditing(null)}
					/>
				</div>
			)}

			{addresses.data && list.length === 0 && editing !== 'new' && (
				<div className={shared.card}>
					<p>Save your shipping address to check out faster.</p>
				</div>
			)}

			<ul role='list' className={style.list}>
				{list.map((address) =>
					editing === address._id ? (
						<li key={address._id} className={shared.card}>
							<h2 className={style.formTitle}>Edit address</h2>
							<AddressForm
								address={address}
								mutation={update}
								submitLabel='Save changes'
								onCancel={() => setEditing(null)}
							/>
						</li>
					) : (
						<li key={address._id} className={`${shared.card} ${style.address}`}>
							{address.isDefault && <span className={shared.badge}>Default</span>}
							<address className={style.lines}>
								<strong>{address.fullName}</strong>
								<br />
								{address.street}
								<br />
								{address.postalCode} {address.city}
								<br />
								{address.country}
							</address>
							<div className={shared.actions}>
								<Button variant='ghost' size='sm' onClick={() => setEditing(address._id)}>
									Edit
								</Button>
								{!address.isDefault && (
									<Button
										variant='ghost'
										size='sm'
										onClick={() => makeDefault.mutate(address._id)}
										disabled={makeDefault.isPending}
									>
										Make default
									</Button>
								)}
								<Button
									variant='ghost'
									size='sm'
									onClick={() => handleDelete(address)}
									disabled={removal.isPending}
								>
									Delete
								</Button>
							</div>
						</li>
					),
				)}
			</ul>

			{!canAdd && <p className={shared.muted}>You can save up to {MAX_ADDRESSES} addresses.</p>}
		</section>
	)
}

export default AddressesPage
