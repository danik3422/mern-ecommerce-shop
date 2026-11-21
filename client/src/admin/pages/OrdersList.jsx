import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { adminKeys, fetchAdminOrders } from '../../api/admin'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import TextField from '../../components/ui/TextField'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import SearchBox from '../components/SearchBox'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { ORDER_STATUSES, formatDateTime, orderNumber } from '../format'
import { useListParams } from '../useListParams'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
	{ value: '', label: 'All statuses' },
	...ORDER_STATUSES.map((status) => ({ value: status, label: capitalize(status) })),
]

const RETURN_OPTIONS = [
	{ value: '', label: 'Any return state' },
	{ value: 'requested', label: 'Return requested' },
	{ value: 'approved', label: 'Return approved' },
	{ value: 'rejected', label: 'Return rejected' },
	{ value: 'refunded', label: 'Return refunded' },
]

const itemCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0)

const FILTERS = { q: '', status: '', returnStatus: '', from: '', to: '' }

const OrdersList = () => {
	const navigate = useNavigate()
	const { values, params, setParam, setParams, setPage } = useListParams(FILTERS)
	const hasFilters = Object.values(values).some(Boolean)
	const query = { ...params, limit: PAGE_SIZE }

	const orders = useQuery({
		queryKey: adminKeys.orders(query),
		queryFn: ({ signal }) => fetchAdminOrders(query, signal),
		placeholderData: keepPreviousData,
	})

	return (
		<>
			<PageHeader
				title='Orders'
				description='Follow up payments, shipping and returns. Click an order to open it.'
			/>

			<div className={table.toolbar}>
				<SearchBox
					key={values.q}
					label='Order number, email or name'
					value={values.q}
					onSearch={(q) => setParam('q', q)}
				/>
				<Select
					label='Status'
					value={values.status}
					options={STATUS_OPTIONS}
					onChange={(e) => setParam('status', e.target.value)}
				/>
				<Select
					label='Returns'
					value={values.returnStatus}
					options={RETURN_OPTIONS}
					onChange={(e) => setParam('returnStatus', e.target.value)}
				/>
				<TextField
					label='From'
					type='date'
					value={values.from}
					max={values.to || undefined}
					onChange={(e) => setParam('from', e.target.value)}
				/>
				<TextField
					label='To'
					type='date'
					value={values.to}
					min={values.from || undefined}
					onChange={(e) => setParam('to', e.target.value)}
				/>
				{hasFilters && (
					<Button variant='ghost' onClick={() => setParams(FILTERS)}>
						Clear filters
					</Button>
				)}
			</div>

			<QueryState query={orders} label='orders'>
				{(data) => (
					<>
						<div className={`${table.panel} ${table.scroll}`}>
							{data.items.length ? (
								<table className={table.table} aria-busy={orders.isFetching}>
									<thead>
										<tr>
											<th scope='col'>Order</th>
											<th scope='col'>Date</th>
											<th scope='col'>Customer</th>
											<th scope='col'>Status</th>
											<th scope='col' className={table.numeric}>
												Items
											</th>
											<th scope='col' className={table.numeric}>
												Total
											</th>
										</tr>
									</thead>
									<tbody>
										{data.items.map((order) => (
											<tr
												key={order._id}
												className={table.clickable}
												onClick={(e) => {
													if (!e.target.closest('a')) navigate(`/admin/orders/${order._id}`)
												}}
											>
												<td>
													<Link to={`/admin/orders/${order._id}`} className={table.rowLink}>
														{orderNumber(order._id)}
													</Link>
												</td>
												<td className={`${table.muted} ${table.nowrap}`}>
													{formatDateTime(order.createdAt)}
												</td>
												<td>
													{order.user ? (
														<>
															{order.user.username}
															<div className={table.muted}>{order.user.email}</div>
														</>
													) : (
														<>
															{/* populate turns a deleted account into null; guests have no user */}
															<span className={table.muted}>
																{order.user === null ? 'Deleted account' : 'Guest'}
															</span>
															{order.email && <div className={table.muted}>{order.email}</div>}
														</>
													)}
												</td>
												<td className={table.nowrap}>
													<StatusBadge status={order.status} />{' '}
													{order.returnRequest?.status && (
														<StatusBadge status={order.returnRequest.status} />
													)}
												</td>
												<td className={table.numeric}>{itemCount(order)}</td>
												<td className={table.numeric}>{formatMoney(order.amount)}</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>No orders match these filters.</p>
							)}
						</div>
						<Pager {...data} limit={PAGE_SIZE} onChange={setPage} />
					</>
				)}
			</QueryState>
		</>
	)
}

export default OrdersList
