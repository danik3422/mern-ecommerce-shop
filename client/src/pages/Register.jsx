import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../api/client'
import { useAuth } from '../auth/useAuth'
import AuthCard from '../components/auth/AuthCard'
import formStyle from '../components/auth/AuthForm.module.css'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/useI18n'

const MIN_PASSWORD_LENGTH = 8

const FIELDS = [
	{ name: 'username', labelKey: 'auth.username', autoComplete: 'username', minLength: 3 },
	{ name: 'email', labelKey: 'auth.email', type: 'email', autoComplete: 'email' },
	{
		name: 'password',
		labelKey: 'auth.password',
		type: 'password',
		autoComplete: 'new-password',
		minLength: MIN_PASSWORD_LENGTH,
		hintKey: 'auth.passwordHint',
	},
	{ name: 'confirm', labelKey: 'auth.confirm', type: 'password', autoComplete: 'new-password' },
]

const Register = () => {
	const { t } = useI18n()
	useDocumentTitle(t('auth.registerTitle'))
	const { register } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
	const [error, setError] = useState(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const fieldErrors = {
		...getFieldErrors(error),
		...(error === 'mismatch' && { confirm: t('auth.mismatch') }),
	}
	const generalError = error && error !== 'mismatch' && !Object.keys(fieldErrors).length

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (form.password !== form.confirm) return setError('mismatch')

		setError(null)
		setIsSubmitting(true)
		try {
			const { username, email, password } = form
			await register({ username, email, password })
			navigate(location.state?.from ?? '/', { replace: true })
		} catch (err) {
			setError(err)
			setIsSubmitting(false)
		}
	}

	return (
		<AuthCard
			title={t('auth.createAccount')}
			subtitle={t('auth.registerSubtitle')}
			footer={
				<>
					{t('auth.haveAccount')}{' '}
					<Link to='/login' state={location.state}>
						{t('auth.signIn')}
					</Link>
				</>
			}
		>
			<form className={formStyle.form} onSubmit={handleSubmit}>
				{FIELDS.map(({ name, labelKey, hintKey, ...field }) => (
					<TextField
						key={name}
						name={name}
						value={form[name]}
						onChange={handleChange}
						label={t(labelKey)}
						hint={hintKey && t(hintKey, { count: MIN_PASSWORD_LENGTH })}
						error={fieldErrors[name]}
						required
						{...field}
					/>
				))}
				{generalError && <Alert tone='error'>{getErrorMessage(error)}</Alert>}
				<Button type='submit' fullWidth disabled={isSubmitting}>
					{isSubmitting ? t('auth.creating') : t('auth.create')}
				</Button>
			</form>
		</AuthCard>
	)
}

export default Register
