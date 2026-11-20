import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { deleteAccount, updateProfile } from '../../api/account'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import shared from '../../components/account/Account.module.css'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import style from './ProfilePage.module.css'

/** Only the fields that changed are sent; email and password changes need the current password. */
const buildChanges = (form, user) => {
	const changes = {}
	if (form.username.trim() !== user.username) changes.username = form.username.trim()
	if (form.email.trim().toLowerCase() !== user.email) changes.email = form.email.trim()
	if (form.newPassword) changes.newPassword = form.newPassword
	if ((changes.email || changes.newPassword) && form.currentPassword) {
		changes.currentPassword = form.currentPassword
	}
	return changes
}

const ProfilePage = () => {
	useDocumentTitle('Profile')
	const { user, updateUser, logout } = useAuth()
	const navigate = useNavigate()
	const [form, setForm] = useState({
		username: user.username,
		email: user.email,
		newPassword: '',
		currentPassword: '',
	})

	const changes = buildChanges(form, user)
	const needsCurrentPassword = Boolean(changes.email || changes.newPassword)
	const hasChanges = ['username', 'email', 'newPassword'].some((key) => key in changes)

	const profile = useMutation({
		mutationFn: (changes) => updateProfile(changes),
		onSuccess: (updatedUser) => {
			updateUser(updatedUser)
			setForm({ ...form, newPassword: '', currentPassword: '' })
		},
	})
	const removal = useMutation({
		mutationFn: () => deleteAccount(),
		onSuccess: () => {
			logout()
			navigate('/', { replace: true })
		},
	})

	const fieldErrors = getFieldErrors(profile.error)
	// 403 means the current password was wrong
	const currentPasswordError =
		fieldErrors.currentPassword ??
		(profile.error?.response?.status === 403 ? getErrorMessage(profile.error) : undefined)

	const handleChange = (e) => {
		profile.reset()
		setForm({ ...form, [e.target.name]: e.target.value })
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		profile.mutate(changes)
	}

	const handleDelete = () => {
		if (
			window.confirm(
				'Delete your account? Your bag, wishlist and addresses will be removed. This cannot be undone.',
			)
		) {
			removal.mutate()
		}
	}

	const generalError = profile.isError && !Object.keys(fieldErrors).length && !currentPasswordError

	return (
		<div className={shared.section}>
			<section className={shared.section} aria-labelledby='profile-title'>
				<h1 id='profile-title' className={shared.title}>
					Profile
				</h1>
				<form className={shared.form} onSubmit={handleSubmit}>
					<TextField
						label='Username'
						name='username'
						autoComplete='username'
						minLength={3}
						value={form.username}
						onChange={handleChange}
						error={fieldErrors.username}
						required
					/>
					<TextField
						label='Email'
						name='email'
						type='email'
						autoComplete='email'
						value={form.email}
						onChange={handleChange}
						error={fieldErrors.email}
						required
					/>
					<TextField
						label='New password'
						name='newPassword'
						type='password'
						autoComplete='new-password'
						minLength={8}
						hint='Leave empty to keep your current password'
						value={form.newPassword}
						onChange={handleChange}
						error={fieldErrors.newPassword}
					/>
					{needsCurrentPassword && (
						<TextField
							label='Current password'
							name='currentPassword'
							type='password'
							autoComplete='current-password'
							hint='Required to change your email or password'
							value={form.currentPassword}
							onChange={handleChange}
							error={currentPasswordError}
							required
						/>
					)}
					{generalError && <Alert tone='error'>{getErrorMessage(profile.error)}</Alert>}
					{profile.isSuccess && <Alert tone='success'>Your profile has been updated.</Alert>}
					<div className={shared.actions}>
						<Button type='submit' disabled={!hasChanges || profile.isPending}>
							{profile.isPending ? 'Saving…' : 'Save changes'}
						</Button>
					</div>
				</form>
			</section>

			<section className={`${shared.card} ${style.danger}`} aria-labelledby='delete-title'>
				<h2 id='delete-title' className={style.dangerTitle}>
					Delete account
				</h2>
				<p className={shared.muted}>
					Your bag, wishlist and saved addresses will be removed. Past orders are kept for our
					records.
				</p>
				{removal.isError && <Alert tone='error'>{getErrorMessage(removal.error)}</Alert>}
				<div>
					<Button variant='secondary' size='sm' onClick={handleDelete} disabled={removal.isPending}>
						{removal.isPending ? 'Deleting…' : 'Delete my account'}
					</Button>
				</div>
			</section>
		</div>
	)
}

export default ProfilePage
