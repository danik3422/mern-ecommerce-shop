import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminKeys, decideReturn } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import { returnReasonLabel } from '../../components/orders/returns'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { formatMoney } from '../../utils/money'
import { formatDateTime } from '../format'
import StatusBadge from './StatusBadge'
import table from './Table.module.css'
import style from './ReturnPanel.module.css'

/** Admin view of a return request with the next possible decisions. */
const ReturnPanel = ({ order }) => {
	const queryClient = useQueryClient()
	const request = order.returnRequest
	const [note, setNote] = useState(request.note ?? '')
	const decide = useMutation({
		mutationFn: (status) => decideReturn(order._id, { status, note: note.trim() || undefined }),
		onSuccess: (updated) => {
			queryClient.setQueryData(adminKeys.order(order._id), (current) => ({
				...current,
				...updated,
			}))
			queryClient.invalidateQueries({ queryKey: adminKeys.all })
		},
	})

	const confirmRefund = () => {
		const how = order.payment?.paymentIntentId
			? 'through Stripe'
			: 'manually (the order was not paid online)'
		if (
			window.confirm(
				`Mark the parcel as received? The items go back into stock and ${formatMoney(request.refundAmount)} is refunded ${how}.`,
			)
		) {
			decide.mutate('refunded')
		}
	}

	return (
		<section className={`${table.panel} ${style.panel}`} aria-labelledby='return-title'>
			<div className={style.header}>
				<h2 id='return-title' className={style.title}>
					Return
				</h2>
				<StatusBadge status={request.status} />
			</div>
			<dl className={style.facts}>
				<dt>Requested</dt>
				<dd>{formatDateTime(request.requestedAt)}</dd>
				<dt>Reason</dt>
				<dd>{returnReasonLabel(request.reason)}</dd>
				{request.comment && (
					<>
						<dt>Comment</dt>
						<dd>{request.comment}</dd>
					</>
				)}
				<dt>Refund</dt>
				<dd>
					{formatMoney(request.refundAmount)}
					{request.status === 'refunded' &&
						(request.refundedOnline ? ' — refunded through Stripe' : ' — refund manually')}
				</dd>
			</dl>
			<ul role='list' className={style.items}>
				{request.items.map((item, index) => (
					<li key={index}>
						{item.quantity} × {item.title} ({item.color}, {item.size})
					</li>
				))}
			</ul>

			{['requested', 'approved'].includes(request.status) && (
				<>
					<TextField
						label='Note to the customer'
						value={note}
						onChange={(e) => setNote(e.target.value)}
						hint='Included in the email, e.g. return instructions or why it was rejected'
					/>
					<div className={style.actions}>
						{request.status === 'requested' && (
							<>
								<Button
									size='sm'
									onClick={() => decide.mutate('approved')}
									disabled={decide.isPending}
								>
									Approve
								</Button>
								<Button
									size='sm'
									variant='secondary'
									onClick={() => decide.mutate('rejected')}
									disabled={decide.isPending}
								>
									Reject
								</Button>
							</>
						)}
						{request.status === 'approved' && (
							<Button size='sm' onClick={confirmRefund} disabled={decide.isPending}>
								Parcel received — refund
							</Button>
						)}
					</div>
				</>
			)}
			{decide.isError && <Alert tone='error'>{getErrorMessage(decide.error)}</Alert>}
		</section>
	)
}

export default ReturnPanel
