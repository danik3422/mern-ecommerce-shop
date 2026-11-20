import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import {
	adminKeys,
	createPromoCode,
	deletePromoCode,
	fetchPromoCodes,
	updatePromoCode,
} from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { formatMoney } from '../../utils/money'
import PageHeader from '../components/PageHeader'
import PromoCodeForm from '../components/PromoCodeForm'
import QueryState from '../components/QueryState'
import table from '../components/Table.module.css'
import { formatDate } from '../format'
import { describeDiscount, promoStatus, promoToForm } from '../promoForm'

const validity = (promo) => {
	if (!promo.startsAt && !promo.endsAt) return 'Always'
	return `${formatDate(promo.startsAt)} – ${formatDate(promo.endsAt)}`
}

const PromoCodes = () => {
	const queryClient = useQueryClient()
	const promos = useQuery({
		queryKey: adminKeys.promoCodes,
		queryFn: ({ signal }) => fetchPromoCodes(signal),
	})
	// null: closed, 'new', or the promo being edited
	const [editing, setEditing] = useState(null)

	const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.promoCodes })
	const save = useMutation({
		mutationFn: (body) =>
			editing === 'new' ? createPromoCode(body) : updatePromoCode(editing._id, body),
		onSuccess: () => {
			refresh()
			setEditing(null)
		},
	})
	const remove = useMutation({ mutationFn: deletePromoCode, onSuccess: refresh })

	const open = (promo) => {
		save.reset()
		setEditing(promo)
	}

	const handleDelete = (promo) => {
		if (window.confirm(`Delete the code ${promo.code}? Orders that used it keep their discount.`)) {
			remove.mutate(promo._id)
		}
	}

	return (
		<>
			<PageHeader
				title='Promo codes'
				description='Discounts customers enter in the bag.'
				actions={
					<Button onClick={() => open('new')}>
						<Plus size={16} aria-hidden /> New code
					</Button>
				}
			/>
			{remove.isError && <Alert tone='error'>{getErrorMessage(remove.error)}</Alert>}
			<QueryState query={promos} label='promo codes'>
				{(data) =>
					data.length ? (
						<div className={`${table.panel} ${table.scroll}`}>
							<table className={table.table}>
								<thead>
									<tr>
										<th scope='col'>Code</th>
										<th scope='col'>Discount</th>
										<th scope='col'>Minimum</th>
										<th scope='col'>Valid</th>
										<th scope='col' className={table.numeric}>
											Used
										</th>
										<th scope='col'>Status</th>
										<th scope='col'>
											<span className='visually-hidden'>Actions</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{data.map((promo) => (
										<tr key={promo._id}>
											<td className={table.rowLink}>{promo.code}</td>
											<td>{describeDiscount(promo, formatMoney)}</td>
											<td>{promo.minSubtotal ? formatMoney(promo.minSubtotal) : '—'}</td>
											<td className={`${table.muted} ${table.nowrap}`}>{validity(promo)}</td>
											<td className={table.numeric}>
												{promo.usedCount}
												{promo.maxUses ? ` / ${promo.maxUses}` : ''}
											</td>
											<td>{promoStatus(promo)}</td>
											<td>
												<div className={table.actions}>
													<Button variant='secondary' size='sm' onClick={() => open(promo)}>
														Edit
													</Button>
													<Button
														variant='ghost'
														size='sm'
														onClick={() => handleDelete(promo)}
														aria-label={`Delete ${promo.code}`}
													>
														Delete
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className={table.muted}>No promo codes yet.</p>
					)
				}
			</QueryState>

			{editing && (
				<Modal
					title={editing === 'new' ? 'New promo code' : `Edit ${editing.code}`}
					onClose={() => setEditing(null)}
				>
					<PromoCodeForm
						initialValues={editing === 'new' ? undefined : promoToForm(editing)}
						mutation={save}
						onSubmit={(body) => save.mutate(body)}
						onCancel={() => setEditing(null)}
					/>
				</Modal>
			)}
		</>
	)
}

export default PromoCodes
