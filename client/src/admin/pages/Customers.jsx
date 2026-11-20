import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminKeys, deleteUser, fetchUsers, setUserAdmin } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { formatDate } from '../format'

const Customers = () => {
	const { user: me } = useAuth()
	const queryClient = useQueryClient()
	const users = useQuery({ queryKey: adminKeys.users, queryFn: ({ signal }) => fetchUsers(signal) })

	const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all })
	const toggleAdmin = useMutation({
		mutationFn: ({ id, isAdmin }) => setUserAdmin(id, isAdmin),
		onSuccess: refresh,
	})
	const remove = useMutation({ mutationFn: deleteUser, onSuccess: refresh })

	const error = toggleAdmin.error ?? remove.error

	const handleDelete = (user) => {
		if (window.confirm(`Delete the account "${user.username}"? Their orders are kept.`)) {
			remove.mutate(user._id)
		}
	}

	return (
		<>
			<PageHeader title='Customers' description='Accounts and admin access.' />
			{error && <Alert tone='error'>{getErrorMessage(error)}</Alert>}
			<QueryState query={users} label='customers'>
				{(data) => (
					<div className={`${table.panel} ${table.scroll}`}>
						<table className={table.table}>
							<thead>
								<tr>
									<th scope='col'>Username</th>
									<th scope='col'>Email</th>
									<th scope='col'>Joined</th>
									<th scope='col'>Role</th>
									<th scope='col'>
										<span className='visually-hidden'>Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{data.map((user) => {
									const isMe = user._id === me._id
									return (
										<tr key={user._id}>
											<td className={table.rowLink}>
												{user.username}
												{isMe && <span className={table.muted}> (you)</span>}
											</td>
											<td>{user.email}</td>
											<td className={`${table.muted} ${table.nowrap}`}>
												{formatDate(user.createdAt)}
											</td>
											<td>{user.isAdmin ? <StatusBadge status='admin' /> : 'Customer'}</td>
											<td>
												<div className={table.actions}>
													<Button
														variant='secondary'
														size='sm'
														disabled={isMe || toggleAdmin.isPending}
														title={isMe ? 'You cannot change your own role' : undefined}
														onClick={() =>
															toggleAdmin.mutate({ id: user._id, isAdmin: !user.isAdmin })
														}
													>
														{user.isAdmin ? 'Remove admin' : 'Make admin'}
													</Button>
													<Button
														variant='ghost'
														size='sm'
														disabled={isMe || remove.isPending}
														onClick={() => handleDelete(user)}
														aria-label={`Delete ${user.username}`}
													>
														Delete
													</Button>
												</div>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</QueryState>
		</>
	)
}

export default Customers
