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
import { useI18n } from '../../i18n/useI18n'
import { useConfirm } from '../../components/ui/confirm/useConfirm'
import { useToast } from '../../components/ui/toast/useToast'

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
	const { t } = useI18n()
	useDocumentTitle(t('profile.title'))
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

	const toast = useToast()
	const confirm = useConfirm()

	const profile = useMutation({
		mutationFn: (changes) => updateProfile(changes),
		onSuccess: (updatedUser) => {
			updateUser(updatedUser)
			setForm({ ...form, newPassword: '', currentPassword: '' })
			toast.show({ tone: 'success', message: t('profile.updated') })
		},
	})
	const removal = useMutation({
		mutationFn: () => deleteAccount(),
		onSuccess: () => {
			logout()
			navigate('/', { replace: true })
			toast.show({ message: t('profile.deleted') })
		},
		onError: (error) => toast.show({ tone: 'error', message: getErrorMessage(error) }),
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

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: t('profile.confirmDeleteTitle'),
			message: t('profile.confirmDelete'),
			confirmLabel: t('profile.deleteButton'),
			tone: 'danger',
		})
		if (confirmed) removal.mutate()
	}

	const generalError = profile.isError && !Object.keys(fieldErrors).length && !currentPasswordError

	return (
		<div className={shared.section}>
			<section className={shared.section} aria-labelledby='profile-title'>
				<h1 id='profile-title' className={shared.title}>
					{t('profile.title')}
				</h1>
				<form className={shared.form} onSubmit={handleSubmit}>
					<TextField
						label={t('auth.username')}
						name='username'
						autoComplete='username'
						minLength={3}
						value={form.username}
						onChange={handleChange}
						error={fieldErrors.username}
						required
					/>
					<TextField
						label={t('auth.email')}
						name='email'
						type='email'
						autoComplete='email'
						value={form.email}
						onChange={handleChange}
						error={fieldErrors.email}
						required
					/>
					<TextField
						label={t('profile.newPassword')}
						name='newPassword'
						type='password'
						autoComplete='new-password'
						minLength={8}
						hint={t('profile.newPasswordHint')}
						value={form.newPassword}
						onChange={handleChange}
						error={fieldErrors.newPassword}
					/>
					{needsCurrentPassword && (
						<TextField
							label={t('profile.currentPassword')}
							name='currentPassword'
							type='password'
							autoComplete='current-password'
							hint={t('profile.currentPasswordHint')}
							value={form.currentPassword}
							onChange={handleChange}
							error={currentPasswordError}
							required
						/>
					)}
					{generalError && <Alert tone='error'>{getErrorMessage(profile.error)}</Alert>}
					<div className={shared.actions}>
						<Button type='submit' disabled={!hasChanges || profile.isPending}>
							{profile.isPending ? t('common.saving') : t('profile.save')}
						</Button>
					</div>
				</form>
			</section>

			<section className={`${shared.card} ${style.danger}`} aria-labelledby='delete-title'>
				<h2 id='delete-title' className={style.dangerTitle}>
					{t('profile.deleteTitle')}
				</h2>
				<p className={shared.muted}>{t('profile.deleteText')}</p>
				<div>
					<Button variant='secondary' size='sm' onClick={handleDelete} disabled={removal.isPending}>
						{removal.isPending ? t('profile.deleting') : t('profile.deleteButton')}
					</Button>
				</div>
			</section>
		</div>
	)
}

export default ProfilePage
