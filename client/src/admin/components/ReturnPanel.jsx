import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { adminKeys, decideReturn } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { returnReasonLabel } from '../../components/orders/returns'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useToast } from '../../components/ui/toast/useToast'
import { formatMoney } from '../../utils/money'
import { formatDateTime } from '../format'
import { can } from '../permissions'
import { useAdminConfirm } from '../useAdminConfirm'
import StatusBadge from './StatusBadge'
import table from './Table.module.css'
import style from './ReturnPanel.module.css'

const DECIDED = {
	approved: 'Return approved — the customer was emailed',
	rejected: 'Return rejected — the customer was emailed',
	refunded: 'Return refunded and items put back in stock',
}

/** Admin view of a return request; decisions need the "returns" permission. */
const ReturnPanel = ({ order }) => {
	const queryClient = useQueryClient()
	const { user } = useAuth()
	const toast = useToast()
	const confirm = useAdminConfirm()
	const canDecide = can(user, 'returns')
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
			toast.show({ tone: 'success', message: DECIDED[updated.returnRequest?.status] ?? 'Saved' })
		},
		onError: (error) =>
			toast.show({
				tone: 'error',
				title: 'Could not update the return',
				message: getErrorMessage(error),
			}),
	})

	const confirmRefund = async () => {
		const how = order.payment?.paymentIntentId
			? 'through Stripe'
			: 'manually (the order was not paid online)'
		const confirmed = await confirm({
			title: 'Parcel received — refund?',
			message: `The items go back into stock and ${formatMoney(request.refundAmount)} is refunded ${how}. This cannot be undone.`,
			confirmLabel: 'Refund',
		})
		if (confirmed) decide.mutate('refunded')
	}

	const confirmReject = async () => {
		const confirmed = await confirm({
			title: 'Reject the return?',
			message: 'The customer is emailed with your note, so explain why.',
			confirmLabel: 'Reject return',
			tone: 'danger',
		})
		if (confirmed) decide.mutate('rejected')
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

			{canDecide && ['requested', 'approved'].includes(request.status) && (
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
									onClick={confirmReject}
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
		</section>
	)
}

export default ReturnPanel
