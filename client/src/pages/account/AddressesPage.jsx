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
import { useI18n } from '../../i18n/useI18n'

const MAX_ADDRESSES = 10

/** `editing`: null — nothing open, 'new' — add form, otherwise the id of the edited address */
const AddressesPage = () => {
	const { t } = useI18n()
	useDocumentTitle(t('addresses.title'))
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
		if (
			window.confirm(t('addresses.confirmDelete', { name: address.fullName, city: address.city }))
		) {
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
					{t('addresses.title')}
				</h1>
				{editing !== 'new' && canAdd && (
					<Button variant='secondary' size='sm' onClick={() => setEditing('new')}>
						<Plus size={16} aria-hidden /> {t('addresses.add')}
					</Button>
				)}
			</div>

			{addresses.isPending && <p className={shared.muted}>{t('address.loading')}</p>}
			{addresses.isError && (
				<Alert tone='error'>
					{t('addresses.loadError', { error: getErrorMessage(addresses.error) })}
				</Alert>
			)}
			{actionError && <Alert tone='error'>{getErrorMessage(actionError)}</Alert>}

			{editing === 'new' && (
				<div className={shared.card}>
					<h2 className={style.formTitle}>{t('addresses.newTitle')}</h2>
					<AddressForm
						mutation={creation}
						submitLabel={t('addresses.save')}
						onCancel={() => setEditing(null)}
					/>
				</div>
			)}

			{addresses.data && list.length === 0 && editing !== 'new' && (
				<div className={shared.card}>
					<p>{t('addresses.empty')}</p>
				</div>
			)}

			<ul role='list' className={style.list}>
				{list.map((address) =>
					editing === address._id ? (
						<li key={address._id} className={shared.card}>
							<h2 className={style.formTitle}>{t('addresses.editTitle')}</h2>
							<AddressForm
								address={address}
								mutation={update}
								submitLabel={t('addresses.saveChanges')}
								onCancel={() => setEditing(null)}
							/>
						</li>
					) : (
						<li key={address._id} className={`${shared.card} ${style.address}`}>
							{address.isDefault && <span className={shared.badge}>{t('address.default')}</span>}
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
									{t('addresses.edit')}
								</Button>
								{!address.isDefault && (
									<Button
										variant='ghost'
										size='sm'
										onClick={() => makeDefault.mutate(address._id)}
										disabled={makeDefault.isPending}
									>
										{t('addresses.makeDefault')}
									</Button>
								)}
								<Button
									variant='ghost'
									size='sm'
									onClick={() => handleDelete(address)}
									disabled={removal.isPending}
								>
									{t('addresses.delete')}
								</Button>
							</div>
						</li>
					),
				)}
			</ul>

			{!canAdd && <p className={shared.muted}>{t('addresses.limit', { count: MAX_ADDRESSES })}</p>}
		</section>
	)
}

export default AddressesPage
