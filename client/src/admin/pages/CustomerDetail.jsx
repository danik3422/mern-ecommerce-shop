import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Mail, Trash2, Unlock } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { adminKeys, deleteUser, fetchCustomer, updateCustomer } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast/useToast'
import { formatMoney } from '../../utils/money'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { formatDate, formatDateTime, orderNumber } from '../format'
import { useAdminConfirm } from '../useAdminConfirm'
import style from './CustomerDetail.module.css'

const Stat = ({ label, children }) => (
	<div className={`${table.panel} ${style.stat}`}>
		<dt className={style.statLabel}>{label}</dt>
		<dd className={style.statValue}>{children}</dd>
	</div>
)

/** Block/unblock and delete, each confirmed first. */
const CustomerActions = ({ customer }) => {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const toast = useToast()
	const confirm = useAdminConfirm()
	const onError = (title) => (error) =>
		toast.show({ tone: 'error', title, message: getErrorMessage(error) })

	const block = useMutation({
		mutationFn: (blocked) => updateCustomer(customer._id, { blocked }),
		onSuccess: async (user) => {
			await queryClient.invalidateQueries({ queryKey: adminKeys.all })
			toast.show({
				tone: 'success',
				message: user.blocked
					? `${user.username} is blocked`
					: `${user.username} can sign in again`,
			})
		},
		onError: onError('Could not change the account'),
	})
	const remove = useMutation({
		mutationFn: () => deleteUser(customer._id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminKeys.all })
			toast.show({ tone: 'success', message: `Account ${customer.username} deleted` })
			navigate('/admin/customers', { replace: true })
		},
		onError: onError('Could not delete the account'),
	})

	const toggleBlock = async () => {
		const blocking = !customer.blocked
		const confirmed = await confirm(
			blocking
				? {
						title: `Block ${customer.username}?`,
						message:
							'They are signed out right away and cannot sign in until unblocked. Their orders stay as they are.',
						confirmLabel: 'Block account',
						tone: 'danger',
					}
				: {
						title: `Unblock ${customer.username}?`,
						message: 'They can sign in and shop again.',
						confirmLabel: 'Unblock',
					},
		)
		if (confirmed) block.mutate(blocking)
	}

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: `Delete ${customer.username}'s account?`,
			message:
				'The account, address book and wishlist are removed for good. Orders and reviews are kept for the records.',
			confirmLabel: 'Delete account',
			tone: 'danger',
		})
		if (confirmed) remove.mutate()
	}

	return (
		<>
			<Button as='a' href={`mailto:${customer.email}`} variant='secondary' size='sm'>
				<Mail size={14} aria-hidden /> Email
			</Button>
			<Button variant='secondary' size='sm' onClick={toggleBlock} disabled={block.isPending}>
				{customer.blocked ? (
					<>
						<Unlock size={14} aria-hidden /> Unblock
					</>
				) : (
					<>
						<Ban size={14} aria-hidden /> Block
					</>
				)}
			</Button>
			<Button variant='ghost' size='sm' onClick={handleDelete} disabled={remove.isPending}>
				<Trash2 size={14} aria-hidden /> Delete account
			</Button>
		</>
	)
}

/** /admin/customers/:id — profile, totals, addresses and orders of one shopper. */
const CustomerDetail = () => {
	const { id } = useParams()
	const customer = useQuery({
		queryKey: adminKeys.customer(id),
		queryFn: ({ signal }) => fetchCustomer(id, signal),
	})
	const data = customer.data

	return (
		<>
			<PageHeader
				title={data?.username ?? 'Customer'}
				description={data && `${data.email} · signed up ${formatDate(data.createdAt)}`}
				back={
					<Link to='/admin/customers' className='eyebrow'>
						<ArrowLeft size={12} aria-hidden style={{ display: 'inline' }} /> Customers
					</Link>
				}
				actions={data && <CustomerActions customer={data} />}
			/>
			<QueryState query={customer} label='the customer'>
				{(data) => (
					<div className={style.layout}>
						<dl className={style.stats}>
							<Stat label='Total spent'>{formatMoney(data.stats.totalSpent)}</Stat>
							<Stat label='Orders'>{data.stats.orders}</Stat>
							<Stat label='Last order'>{formatDate(data.stats.lastOrderAt)}</Stat>
							<Stat label='Reviews'>{data.reviews}</Stat>
						</dl>

						<div className={style.columns}>
							<section className={`${table.panel} ${table.scroll}`} aria-labelledby='orders-title'>
								<h2 id='orders-title' className={style.sectionTitle}>
									Orders
								</h2>
								{data.orders.length ? (
									<table className={table.table}>
										<thead>
											<tr>
												<th scope='col'>Order</th>
												<th scope='col'>Date</th>
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
											{data.orders.map((order) => (
												<tr key={order._id}>
													<td>
														<Link to={`/admin/orders/${order._id}`} className={table.rowLink}>
															{orderNumber(order._id)}
														</Link>
													</td>
													<td className={`${table.muted} ${table.nowrap}`}>
														{formatDateTime(order.createdAt)}
													</td>
													<td>
														<StatusBadge status={order.status} />{' '}
														{order.returnRequest?.status && (
															<StatusBadge status={order.returnRequest.status} />
														)}
													</td>
													<td className={table.numeric}>{order.itemCount}</td>
													<td className={table.numeric}>{formatMoney(order.amount)}</td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<p className={table.empty}>No orders yet.</p>
								)}
							</section>

							<div className={style.side}>
								<section className={`${table.panel} ${style.card}`} aria-labelledby='profile-title'>
									<h2 id='profile-title' className={style.cardTitle}>
										Account
									</h2>
									<dl className={style.facts}>
										<dt>Status</dt>
										<dd>
											<StatusBadge status={data.blocked ? 'blocked' : 'active'} />
										</dd>
										<dt>Email</dt>
										<dd>
											<a href={`mailto:${data.email}`} className='text-link'>
												{data.email}
											</a>
										</dd>
										<dt>Signed up</dt>
										<dd>{formatDateTime(data.createdAt)}</dd>
										<dt>Last sign-in</dt>
										<dd>{formatDateTime(data.lastLoginAt)}</dd>
										<dt>Wishlist</dt>
										<dd>
											{data.wishlistCount} {data.wishlistCount === 1 ? 'product' : 'products'}
										</dd>
									</dl>
								</section>

								<section
									className={`${table.panel} ${style.card}`}
									aria-labelledby='addresses-title'
								>
									<h2 id='addresses-title' className={style.cardTitle}>
										Addresses
									</h2>
									{data.addresses.length ? (
										<ul role='list' className={style.addresses}>
											{data.addresses.map((address) => (
												<li key={address._id}>
													<address className={style.address}>
														{address.fullName}
														{address.isDefault && <span className={table.muted}> · default</span>}
														<br />
														{address.street}
														<br />
														{address.postalCode} {address.city}, {address.country}
													</address>
												</li>
											))}
										</ul>
									) : (
										<p className={table.muted}>No saved addresses.</p>
									)}
								</section>
							</div>
						</div>
					</div>
				)}
			</QueryState>
		</>
	)
}

export default CustomerDetail
