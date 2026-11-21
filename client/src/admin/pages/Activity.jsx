import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { adminKeys, fetchActivity } from '../../api/admin'
import { useAuth } from '../../auth/useAuth'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import table from '../components/Table.module.css'
import { NoAccess } from '../components/NoAccess'
import { formatDateTime } from '../format'
import { useListParams } from '../useListParams'

const PAGE_SIZE = 50

const ACTIONS = {
	'product.create': 'created product',
	'product.update': 'updated product',
	'product.delete': 'deleted product',
	'product.duplicate': 'duplicated product as',
	'product.bulk': 'changed',
	'order.status': 'changed status of order',
	'order.note': 'edited the note of order',
	'order.tracking': 'updated the tracking of order',
	'order.return': 'decided the return of order',
	'customer.update': 'changed customer',
	'customer.signOut': 'signed out on all devices',
	'promoCode.create': 'created promo code',
	'promoCode.update': 'updated promo code',
	'promoCode.delete': 'deleted a promo code',
	'staff.create': 'added staff member',
	'staff.update': 'changed access of',
	'staff.password': 'reset the password of',
	'staff.delete': 'removed staff member',
}

const LINKS = {
	product: (id) => `/admin/products/${id}`,
	order: (id) => `/admin/orders/${id}`,
	customer: (id) => `/admin/customers/${id}`,
}

/** Target of an entry, linked when it still exists in a page of the panel. */
const Target = ({ target, action }) => {
	if (!target?.label) return null
	const link = !action.endsWith('.delete') && target.id && LINKS[target.kind]?.(target.id)
	return link ? (
		<Link to={link} className='text-link'>
			{target.label}
		</Link>
	) : (
		<strong>{target.label}</strong>
	)
}

/** /admin/activity — who did what, newest first (owners only). */
const Activity = () => {
	const { user } = useAuth()
	const { params, setPage } = useListParams({})
	const query = { ...params, limit: PAGE_SIZE }
	const activity = useQuery({
		queryKey: adminKeys.activity(query),
		queryFn: ({ signal }) => fetchActivity(query, signal),
		placeholderData: keepPreviousData,
		enabled: Boolean(user.isOwner),
	})

	if (!user.isOwner) return <NoAccess area='the activity log (owners only)' />

	return (
		<>
			<PageHeader title='Activity' description='Changes made by the team, newest first.' />
			<QueryState query={activity} label='the activity log'>
				{(data) => (
					<>
						<div className={`${table.panel} ${table.scroll}`}>
							{data.items.length ? (
								<table className={table.table}>
									<thead>
										<tr>
											<th scope='col'>When</th>
											<th scope='col'>Who</th>
											<th scope='col'>What</th>
										</tr>
									</thead>
									<tbody>
										{data.items.map((entry) => (
											<tr key={entry._id}>
												<td className={`${table.muted} ${table.nowrap}`}>
													{formatDateTime(entry.createdAt)}
												</td>
												<td className={table.nowrap}>{entry.actorName ?? 'Removed account'}</td>
												<td>
													{ACTIONS[entry.action] ?? entry.action}{' '}
													<Target target={entry.target} action={entry.action} />
													{entry.details && <span className={table.muted}> · {entry.details}</span>}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>Nothing recorded yet.</p>
							)}
						</div>
						<Pager {...data} limit={PAGE_SIZE} onChange={setPage} />
					</>
				)}
			</QueryState>
		</>
	)
}

export default Activity
