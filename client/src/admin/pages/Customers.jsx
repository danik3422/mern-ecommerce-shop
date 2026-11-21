import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { adminKeys, fetchCustomers } from '../../api/admin'
import Select from '../../components/ui/Select'
import { formatMoney } from '../../utils/money'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import SearchBox from '../components/SearchBox'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { formatDate, formatDateTime } from '../format'
import { useListParams } from '../useListParams'

const PAGE_SIZE = 20

const SORT_OPTIONS = [
	{ value: '', label: 'Newest first' },
	{ value: 'oldest', label: 'Oldest first' },
	{ value: 'spent', label: 'Total spent' },
]

const STATUS_OPTIONS = [
	{ value: '', label: 'All customers' },
	{ value: 'active', label: 'Active' },
	{ value: 'blocked', label: 'Blocked' },
]

/** Shoppers who signed up; staff accounts live under Team. */
const Customers = () => {
	const navigate = useNavigate()
	const { values, params, setParam, setPage } = useListParams({ q: '', status: '', sort: '' })
	const query = { ...params, limit: PAGE_SIZE }

	const customers = useQuery({
		queryKey: adminKeys.customers(query),
		queryFn: ({ signal }) => fetchCustomers(query, signal),
		placeholderData: keepPreviousData,
	})

	return (
		<>
			<PageHeader
				title='Customers'
				description='Everyone who signed up in the shop. Click a customer for orders and details.'
			/>

			<div className={table.toolbar}>
				<SearchBox
					key={values.q}
					label='Search by username or email'
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
					label='Sort by'
					value={values.sort}
					options={SORT_OPTIONS}
					onChange={(e) => setParam('sort', e.target.value)}
				/>
			</div>

			<QueryState query={customers} label='customers'>
				{(data) => (
					<>
						<div className={`${table.panel} ${table.scroll}`}>
							{data.items.length ? (
								<table className={table.table} aria-busy={customers.isFetching}>
									<thead>
										<tr>
											<th scope='col'>Customer</th>
											<th scope='col'>Signed up</th>
											<th scope='col'>Last sign-in</th>
											<th scope='col' className={table.numeric}>
												Orders
											</th>
											<th scope='col' className={table.numeric}>
												Total spent
											</th>
											<th scope='col'>Status</th>
										</tr>
									</thead>
									<tbody>
										{data.items.map((customer) => (
											<tr
												key={customer._id}
												className={table.clickable}
												onClick={(e) => {
													if (!e.target.closest('a')) navigate(`/admin/customers/${customer._id}`)
												}}
											>
												<td>
													<Link to={`/admin/customers/${customer._id}`} className={table.rowLink}>
														{customer.username}
													</Link>
													<div className={table.muted}>{customer.email}</div>
												</td>
												<td className={`${table.muted} ${table.nowrap}`}>
													{formatDate(customer.createdAt)}
												</td>
												<td className={`${table.muted} ${table.nowrap}`}>
													{formatDateTime(customer.lastLoginAt)}
												</td>
												<td className={table.numeric}>{customer.orders}</td>
												<td className={table.numeric}>{formatMoney(customer.totalSpent)}</td>
												<td>
													<StatusBadge status={customer.blocked ? 'blocked' : 'active'} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>No customers match these filters.</p>
							)}
						</div>
						<Pager {...data} limit={PAGE_SIZE} onChange={setPage} />
					</>
				)}
			</QueryState>
		</>
	)
}

export default Customers
