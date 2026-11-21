import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
	adminKeys,
	createStaff,
	deleteStaff,
	fetchTeam,
	resetStaffPassword,
	updateStaff,
} from '../../api/admin'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import TextField from '../../components/ui/TextField'
import { useToast } from '../../components/ui/toast/useToast'
import IconButton from '../components/IconButton'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { formatDateTime } from '../format'
import { PERMISSIONS, ROLE_PRESETS, matchingPreset } from '../permissions'
import { useAdminConfirm } from '../useAdminConfirm'
import style from './Team.module.css'

const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** A random 12-character temporary password (no look-alike characters). */
const generatePassword = () =>
	Array.from(
		crypto.getRandomValues(new Uint32Array(12)),
		(n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length],
	).join('')

const roleLabel = (member) => matchingPreset(member)?.label ?? 'Custom'

/** Checkboxes per permission plus preset shortcuts; owners always have everything. */
const PermissionsPicker = ({ value, onChange, canMakeOwner }) => {
	const { permissions, isOwner } = value
	const toggle = (name) =>
		onChange({
			...value,
			permissions: permissions.includes(name)
				? permissions.filter((p) => p !== name)
				: [...permissions, name],
		})

	return (
		<fieldset className={style.fieldset}>
			<legend className={style.legend}>Access</legend>
			<div className={style.presets}>
				<span className={style.muted}>Presets:</span>
				{ROLE_PRESETS.filter((preset) => canMakeOwner || !preset.isOwner).map((preset) => (
					<Button
						key={preset.id}
						variant='secondary'
						size='sm'
						aria-pressed={matchingPreset(value)?.id === preset.id}
						className={style.preset}
						onClick={() =>
							onChange({ permissions: preset.permissions, isOwner: Boolean(preset.isOwner) })
						}
					>
						{preset.label}
					</Button>
				))}
			</div>
			{canMakeOwner && (
				<label className={style.check}>
					<input
						type='checkbox'
						checked={isOwner}
						onChange={(e) => onChange({ ...value, isOwner: e.target.checked })}
					/>
					<span>
						<strong>Owner</strong>
						<span className={style.muted}>Full access, including other owners</span>
					</span>
				</label>
			)}
			<div className={style.permissions}>
				{PERMISSIONS.map(({ name, label, hint }) => (
					<label key={name} className={style.check}>
						<input
							type='checkbox'
							checked={isOwner || permissions.includes(name)}
							disabled={isOwner}
							onChange={() => toggle(name)}
						/>
						<span>
							<strong>{label}</strong>
							<span className={style.muted}>{hint}</span>
						</span>
					</label>
				))}
			</div>
		</fieldset>
	)
}

/** Drawer to add a staff member, or to change one's access (`member` given). */
const StaffDrawer = ({ member, canMakeOwner, onClose }) => {
	const queryClient = useQueryClient()
	const toast = useToast()
	const isNew = !member
	const [form, setForm] = useState(() => ({
		username: '',
		email: '',
		password: isNew ? generatePassword() : '',
		permissions: member?.permissions ?? ROLE_PRESETS[2].permissions,
		isOwner: member?.isOwner ?? false,
	}))
	const save = useMutation({
		mutationFn: () => {
			const access = { permissions: form.isOwner ? [] : form.permissions, isOwner: form.isOwner }
			return isNew
				? createStaff({
						username: form.username.trim(),
						email: form.email.trim(),
						password: form.password,
						...access,
					})
				: updateStaff(member._id, access)
		},
		onSuccess: async (saved) => {
			await queryClient.invalidateQueries({ queryKey: adminKeys.team })
			toast.show({
				tone: 'success',
				title: isNew ? `${saved.username} can sign in now` : 'Access updated',
				message: isNew
					? `Give them the temporary password: ${form.password}`
					: `${saved.username}: ${roleLabel(saved)}`,
			})
			onClose()
		},
	})
	const errors = getFieldErrors(save.error)
	const otherError = save.isError && !Object.keys(errors).length && getErrorMessage(save.error)
	const set = (name) => (e) => setForm((current) => ({ ...current, [name]: e.target.value }))
	const formId = 'staff-form'

	return (
		<Drawer
			title={isNew ? 'Add staff member' : `Access of ${member.username}`}
			onClose={onClose}
			closeLabel='Close'
			footer={
				<div className={style.footer}>
					<Button variant='secondary' onClick={onClose}>
						Cancel
					</Button>
					<Button type='submit' form={formId} disabled={save.isPending}>
						{save.isPending ? 'Saving…' : isNew ? 'Create account' : 'Save access'}
					</Button>
				</div>
			}
		>
			<form
				id={formId}
				className={style.form}
				onSubmit={(e) => {
					e.preventDefault()
					save.mutate()
				}}
				noValidate
			>
				{otherError && <Alert tone='error'>{otherError}</Alert>}
				{isNew && (
					<>
						<TextField
							label='Username'
							value={form.username}
							onChange={set('username')}
							error={errors.username}
							autoComplete='off'
							required
						/>
						<TextField
							label='Email'
							type='email'
							value={form.email}
							onChange={set('email')}
							error={errors.email}
							autoComplete='off'
							required
						/>
						<div className={style.passwordRow}>
							<TextField
								label='Temporary password'
								value={form.password}
								onChange={set('password')}
								error={errors.password}
								hint='Share it privately; they can change it in their account.'
								autoComplete='new-password'
								className={style.grow}
								required
							/>
							<Button
								variant='secondary'
								onClick={() => setForm((current) => ({ ...current, password: generatePassword() }))}
							>
								New
							</Button>
						</div>
					</>
				)}
				<PermissionsPicker
					value={form}
					onChange={(access) => setForm((current) => ({ ...current, ...access }))}
					canMakeOwner={canMakeOwner}
				/>
			</form>
		</Drawer>
	)
}

/** Drawer that sets a new temporary password. */
const PasswordDrawer = ({ member, onClose }) => {
	const toast = useToast()
	const [password, setPassword] = useState(generatePassword)
	const reset = useMutation({
		mutationFn: () => resetStaffPassword(member._id, password),
		onSuccess: () => {
			toast.show({
				tone: 'success',
				title: `New password for ${member.username}`,
				message: `Give them: ${password}`,
			})
			onClose()
		},
	})
	const error = reset.isError && getErrorMessage(reset.error)

	return (
		<Drawer
			title={`Reset password of ${member.username}`}
			onClose={onClose}
			closeLabel='Close'
			footer={
				<div className={style.footer}>
					<Button variant='secondary' onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={() => reset.mutate()} disabled={reset.isPending}>
						{reset.isPending ? 'Saving…' : 'Set password'}
					</Button>
				</div>
			}
		>
			<div className={style.form}>
				<p className={style.muted}>
					Their current password stops working. Existing sessions stay signed in; deactivate the
					account to sign them out.
				</p>
				<TextField
					label='New temporary password'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={error || undefined}
					autoComplete='new-password'
				/>
			</div>
		</Drawer>
	)
}

/** /admin/team — staff accounts and what each may do. */
const Team = () => {
	const { user: me } = useAuth()
	const queryClient = useQueryClient()
	const toast = useToast()
	const confirm = useAdminConfirm()
	const team = useQuery({ queryKey: adminKeys.team, queryFn: ({ signal }) => fetchTeam(signal) })
	// { kind: 'new' | 'edit' | 'password', member? }
	const [drawer, setDrawer] = useState(null)
	const close = () => setDrawer(null)

	const onError = (title) => (error) =>
		toast.show({ tone: 'error', title, message: getErrorMessage(error) })
	const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.team })
	const toggleActive = useMutation({
		mutationFn: (member) => updateStaff(member._id, { blocked: !member.blocked }),
		onSuccess: async (member) => {
			await refresh()
			toast.show({
				tone: 'success',
				message: member.blocked
					? `${member.username} is deactivated`
					: `${member.username} is active again`,
			})
		},
		onError: onError('Could not change the account'),
	})
	const remove = useMutation({
		mutationFn: (member) => deleteStaff(member._id),
		onSuccess: async (_, member) => {
			await refresh()
			toast.show({ tone: 'success', message: `${member.username} removed from the team` })
		},
		onError: onError('Could not remove the account'),
	})

	const handleToggle = async (member) => {
		const deactivating = !member.blocked
		const confirmed = await confirm(
			deactivating
				? {
						title: `Deactivate ${member.username}?`,
						message: 'They are signed out at once and cannot sign in until reactivated.',
						confirmLabel: 'Deactivate',
						tone: 'danger',
					}
				: {
						title: `Reactivate ${member.username}?`,
						message: 'They can sign in again with their current password.',
						confirmLabel: 'Reactivate',
					},
		)
		if (confirmed) toggleActive.mutate(member)
	}

	const handleDelete = async (member) => {
		const confirmed = await confirm({
			title: `Remove ${member.username}?`,
			message: 'The staff account is deleted for good. Deactivate it instead to keep its history.',
			confirmLabel: 'Remove account',
			tone: 'danger',
		})
		if (confirmed) remove.mutate(member)
	}

	return (
		<>
			<PageHeader
				title='Team'
				description='Staff accounts and what each person may do in the admin panel.'
				actions={
					<Button onClick={() => setDrawer({ kind: 'new' })}>
						<Plus size={16} aria-hidden /> Add staff member
					</Button>
				}
			/>
			<QueryState query={team} label='the team'>
				{(data) => (
					<div className={`${table.panel} ${table.scroll}`}>
						<table className={table.table}>
							<thead>
								<tr>
									<th scope='col'>Name</th>
									<th scope='col'>Role</th>
									<th scope='col'>Access</th>
									<th scope='col'>Last sign-in</th>
									<th scope='col'>Status</th>
									<th scope='col' className={style.actionsHead}>
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{data.staff.map((member) => {
									const isMe = member._id === me._id
									// only owners may change owners; nobody deactivates or removes themselves
									const canManage = me.isOwner || !member.isOwner
									return (
										<tr key={member._id}>
											<td>
												<span className={table.rowLink}>{member.username}</span>
												{isMe && <span className={table.muted}> (you)</span>}
												<div className={table.muted}>{member.email}</div>
											</td>
											<td>{member.isOwner ? <StatusBadge status='owner' /> : roleLabel(member)}</td>
											<td className={style.access}>
												{member.isOwner
													? 'Everything'
													: PERMISSIONS.filter((p) => member.permissions.includes(p.name))
															.map((p) => p.label)
															.join(', ') || 'Nothing yet'}
											</td>
											<td className={`${table.muted} ${table.nowrap}`}>
												{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}
											</td>
											<td>
												<StatusBadge status={member.blocked ? 'blocked' : 'active'} />
											</td>
											<td>
												{canManage && (
													<div className={style.rowActions}>
														<IconButton
															label={`Change access of ${member.username}`}
															onClick={() => setDrawer({ kind: 'edit', member })}
														>
															<Pencil size={16} aria-hidden />
														</IconButton>
														<IconButton
															label={`Reset password of ${member.username}`}
															onClick={() => setDrawer({ kind: 'password', member })}
														>
															<KeyRound size={16} aria-hidden />
														</IconButton>
														{!isMe && (
															<>
																<IconButton
																	label={
																		member.blocked
																			? `Reactivate ${member.username}`
																			: `Deactivate ${member.username}`
																	}
																	onClick={() => handleToggle(member)}
																	disabled={toggleActive.isPending}
																>
																	<Power size={16} aria-hidden />
																</IconButton>
																<IconButton
																	label={`Remove ${member.username}`}
																	tone='danger'
																	onClick={() => handleDelete(member)}
																	disabled={remove.isPending}
																>
																	<Trash2 size={16} aria-hidden />
																</IconButton>
															</>
														)}
													</div>
												)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</QueryState>

			{(drawer?.kind === 'new' || drawer?.kind === 'edit') && (
				<StaffDrawer member={drawer.member} canMakeOwner={me.isOwner} onClose={close} />
			)}
			{drawer?.kind === 'password' && <PasswordDrawer member={drawer.member} onClose={close} />}
		</>
	)
}

export default Team
