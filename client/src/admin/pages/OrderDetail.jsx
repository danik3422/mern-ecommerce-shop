import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { adminKeys, fetchAdminOrder, updateOrderStatus } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { ORDER_STATUSES, formatDateTime, orderNumber } from '../format'
import style from './OrderDetail.module.css'

const STATUS_OPTIONS = ORDER_STATUSES.map((status) => ({
	value: status,
	label: capitalize(status),
}))

const StatusForm = ({ order }) => {
	const queryClient = useQueryClient()
	const [status, setStatus] = useState(order.status)
	const save = useMutation({
		mutationFn: () => updateOrderStatus(order._id, status),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
	})

	return (
		<form
			className={style.statusForm}
			onSubmit={(e) => {
				e.preventDefault()
				save.mutate()
			}}
		>
			<Select
				label='Order status'
				hideLabel
				value={status}
				options={STATUS_OPTIONS}
				onChange={(e) => {
					setStatus(e.target.value)
					save.reset()
				}}
			/>
			<Button type='submit' disabled={status === order.status || save.isPending}>
				{save.isPending ? 'Saving…' : 'Update status'}
			</Button>
			{save.isError && <Alert tone='error'>{getErrorMessage(save.error)}</Alert>}
			{save.isSuccess && <Alert tone='success'>Status updated.</Alert>}
			{status === 'cancelled' && order.status !== 'cancelled' && (
				<p className={style.hint}>Cancelling returns the reserved stock.</p>
			)}
		</form>
	)
}

const OrderDetail = () => {
	const { id } = useParams()
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
							<section className={`${table.panel} ${style.card}`} aria-labelledby='status-title'>
								<h2 id='status-title' className={style.cardTitle}>
									Fulfilment
								</h2>
								<StatusForm order={data} key={data.status} />
							</section>

							<section className={`${table.panel} ${style.card}`} aria-labelledby='customer-title'>
								<h2 id='customer-title' className={style.cardTitle}>
									Customer
								</h2>
								{data.user ? (
									<p>
										{data.user.username}
										<br />
										<a href={`mailto:${data.user.email}`} className='text-link'>
											{data.user.email}
										</a>
									</p>
								) : (
									<p className={table.muted}>The account was deleted.</p>
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
