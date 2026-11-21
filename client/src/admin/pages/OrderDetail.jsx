import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { adminKeys, fetchAdminOrder, updateOrderNote, updateOrderStatus } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { useToast } from '../../components/ui/toast/useToast'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import ReturnPanel from '../components/ReturnPanel'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { ORDER_STATUSES, formatDateTime, orderNumber } from '../format'
import TextArea from '../components/TextArea'
import { can } from '../permissions'
import { useAdminConfirm } from '../useAdminConfirm'
import style from './OrderDetail.module.css'

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
	value: status,
	label: capitalize(status),
}))

const StatusForm = ({ order }) => {
	const queryClient = useQueryClient()
	const toast = useToast()
	const confirm = useAdminConfirm()
	const [status, setStatus] = useState(order.status)
	const save = useMutation({
		mutationFn: () => updateOrderStatus(order._id, status),
		onSuccess: async (updated) => {
			await queryClient.invalidateQueries({ queryKey: adminKeys.all })
			toast.show({
				tone: 'success',
				message: `Order ${orderNumber(order._id)} is now ${updated.status}`,
			})
		},
		onError: (error) =>
			toast.show({
				tone: 'error',
				title: 'Could not change the status',
				message: getErrorMessage(error),
			}),
	})

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (status === 'cancelled') {
			const confirmed = await confirm({
				title: 'Cancel this order?',
				message: `The reserved stock goes back on sale${order.payment?.paidAt ? ' and the payment is refunded' : ''}. The customer is emailed. This cannot be undone.`,
				confirmLabel: 'Cancel order',
				cancelLabel: 'Keep order',
				tone: 'danger',
			})
			if (!confirmed) return
		}
		save.mutate()
	}

	return (
		<form className={style.statusForm} onSubmit={handleSubmit}>
			<Select
				label='Order status'
				hideLabel
				value={status}
				options={STATUS_OPTIONS}
				onChange={(e) => setStatus(e.target.value)}
			/>
			<Button type='submit' disabled={status === order.status || save.isPending}>
				{save.isPending ? 'Saving…' : 'Update status'}
			</Button>
			<p className={style.hint}>The customer gets an email about each change.</p>
		</form>
	)
}

/** Internal note for the team; customers never see it. */
const NoteForm = ({ order }) => {
	const queryClient = useQueryClient()
	const toast = useToast()
	const [note, setNote] = useState(order.adminNote ?? '')
	const changed = note.trim() !== (order.adminNote ?? '')
	const save = useMutation({
		mutationFn: () => updateOrderNote(order._id, note.trim()),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminKeys.order(order._id) })
			toast.show({ tone: 'success', message: 'Note saved' })
		},
		onError: (error) =>
			toast.show({
				tone: 'error',
				title: 'Could not save the note',
				message: getErrorMessage(error),
			}),
	})

	return (
		<form
			className={style.statusForm}
			onSubmit={(e) => {
				e.preventDefault()
				save.mutate()
			}}
		>
			<TextArea
				label='Internal note'
				rows={3}
				maxLength={2000}
				value={note}
				onChange={(e) => setNote(e.target.value)}
				placeholder='e.g. Customer called, ship together with order #…'
			/>
			<p className={style.hint}>Only staff see this note.</p>
			<Button type='submit' variant='secondary' disabled={!changed || save.isPending}>
				{save.isPending ? 'Saving…' : 'Save note'}
			</Button>
		</form>
	)
}

/**
 * Events of the order, oldest first. Status changes are recorded since the timeline was added;
 * older orders fall back to their paid/shipped/delivered dates.
 */
const timelineOf = (order) => {
	const events = [{ label: 'Placed', at: order.createdAt }]
	if (order.statusHistory?.length) {
		for (const entry of order.statusHistory) {
			events.push({ label: capitalize(entry.status), at: entry.at, status: entry.status })
		}
	} else {
		if (order.payment?.paidAt) events.push({ label: 'Paid', at: order.payment.paidAt })
		if (order.shippedAt) events.push({ label: 'Shipped', at: order.shippedAt })
		if (order.deliveredAt) events.push({ label: 'Delivered', at: order.deliveredAt })
	}
	const request = order.returnRequest
	if (request) {
		events.push({ label: 'Return requested', at: request.requestedAt })
		if (request.decidedAt && request.status !== 'requested') {
			const decision = request.status === 'rejected' ? 'rejected' : 'approved'
			events.push({ label: `Return ${decision}`, at: request.decidedAt })
		}
		if (request.refundedAt) events.push({ label: 'Return refunded', at: request.refundedAt })
	}
	return events.filter((event) => event.at).sort((a, b) => new Date(a.at) - new Date(b.at))
}

const Timeline = ({ order }) => (
	<ol className={style.timeline}>
		{timelineOf(order).map((event, index) => (
			<li key={index} className={style.event}>
				<span className={style.eventDot} aria-hidden />
				<span className={style.eventLabel}>{event.label}</span>
				<time className={style.eventTime} dateTime={event.at}>
					{formatDateTime(event.at)}
				</time>
			</li>
		))}
	</ol>
)

const OrderDetail = () => {
	const { id } = useParams()
	const { user } = useAuth()
	const order = useQuery({
		queryKey: adminKeys.order(id),
		queryFn: ({ signal }) => fetchAdminOrder(id, signal),
	})

	return (
		<>
			<PageHeader
				title={order.data ? `Order ${orderNumber(order.data._id)}` : 'Order'}
				description={order.data && `Placed ${formatDateTime(order.data.createdAt)}`}
				back={
					<Link to='/admin/orders' className='eyebrow'>
						<ArrowLeft size={12} aria-hidden style={{ display: 'inline' }} /> Orders
					</Link>
				}
				actions={order.data && <StatusBadge status={order.data.status} />}
			/>
			<QueryState query={order} label='the order'>
				{(data) => (
					<div className={style.grid}>
						<section className={`${table.panel} ${style.items}`} aria-label='Items'>
							<table className={table.table}>
								<thead>
									<tr>
										<th scope='col'>Product</th>
										<th scope='col'>Options</th>
										<th scope='col' className={table.numeric}>
											Qty
										</th>
										<th scope='col' className={table.numeric}>
											Price
										</th>
										<th scope='col' className={table.numeric}>
											Total
										</th>
									</tr>
								</thead>
								<tbody>
									{data.items.map((item) => (
										<tr key={`${item.productId}-${item.size}-${item.color}`}>
											<td>
												<div className={style.product}>
													<img className={table.thumb} src={item.image} alt='' />
													<div>
														<Link
															to={`/admin/products/${item.productId}`}
															className={table.rowLink}
														>
															{item.title}
														</Link>
														<div className={table.muted}>{item.brand}</div>
													</div>
												</div>
											</td>
											<td>
												{[item.color && capitalize(item.color), item.size]
													.filter(Boolean)
													.join(' · ')}
											</td>
											<td className={table.numeric}>{item.quantity}</td>
											<td className={table.numeric}>{formatMoney(item.price)}</td>
											<td className={table.numeric}>{formatMoney(item.price * item.quantity)}</td>
										</tr>
									))}
								</tbody>
								<tfoot className={style.totals}>
									<tr>
										<th scope='row' colSpan={4}>
											Subtotal
										</th>
										<td className={table.numeric}>{formatMoney(data.subtotal)}</td>
									</tr>
									<tr>
										<th scope='row' colSpan={4}>
											Shipping
										</th>
										<td className={table.numeric}>
											{data.shipping ? formatMoney(data.shipping) : 'Free'}
										</td>
									</tr>
									<tr className={style.grandTotal}>
										<th scope='row' colSpan={4}>
											Total
										</th>
										<td className={table.numeric}>{formatMoney(data.amount)}</td>
									</tr>
								</tfoot>
							</table>
						</section>

						<div className={style.side}>
							{data.returnRequest && <ReturnPanel order={data} />}
							<section className={`${table.panel} ${style.card}`} aria-labelledby='status-title'>
								<h2 id='status-title' className={style.cardTitle}>
									Fulfilment
								</h2>
								<StatusForm order={data} key={data.status} />
							</section>

							<section className={`${table.panel} ${style.card}`} aria-labelledby='timeline-title'>
								<h2 id='timeline-title' className={style.cardTitle}>
									Timeline
								</h2>
								<Timeline order={data} />
							</section>

							<section className={`${table.panel} ${style.card}`} aria-labelledby='note-title'>
								<h2 id='note-title' className='visually-hidden'>
									Internal note
								</h2>
								<NoteForm order={data} key={data.adminNote ?? ''} />
							</section>

							<section className={`${table.panel} ${style.card}`} aria-labelledby='customer-title'>
								<h2 id='customer-title' className={style.cardTitle}>
									Customer
								</h2>
								{data.user ? (
									<p>
										{can(user, 'customers') ? (
											<Link to={`/admin/customers/${data.user._id}`} className='text-link'>
												{data.user.username}
											</Link>
										) : (
											data.user.username
										)}
										<br />
										<a href={`mailto:${data.user.email}`} className='text-link'>
											{data.user.email}
										</a>
									</p>
								) : (
									<p>
										<span className={table.muted}>
											{data.user === null ? 'The account was deleted.' : 'Guest checkout'}
										</span>
										{data.email && (
											<>
												<br />
												<a href={`mailto:${data.email}`} className='text-link'>
													{data.email}
												</a>
											</>
										)}
									</p>
								)}
								<address className={style.address}>
									{data.address.fullName}
									<br />
									{data.address.street}
									<br />
									{data.address.postalCode} {data.address.city}
									<br />
									{data.address.country}
								</address>
							</section>

							<section className={`${table.panel} ${style.card}`} aria-labelledby='payment-title'>
								<h2 id='payment-title' className={style.cardTitle}>
									Payment
								</h2>
								<dl className={style.facts}>
									<dt>Provider</dt>
									<dd>{data.payment?.provider === 'stripe' ? 'Stripe' : 'Not paid online'}</dd>
									<dt>Paid</dt>
									<dd>{data.payment?.paidAt ? formatDateTime(data.payment.paidAt) : 'Not yet'}</dd>
									{data.payment?.sessionId && (
										<>
											<dt>Session</dt>
											<dd className={style.mono}>{data.payment.sessionId}</dd>
										</>
									)}
								</dl>
							</section>
						</div>
					</div>
				)}
			</QueryState>
		</>
	)
}

export default OrderDetail
