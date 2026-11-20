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

const MIN_PASSWORD_LENGTH = 8

const FIELDS = [
	{ name: 'username', label: 'Username', autoComplete: 'username', minLength: 3 },
	{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
	{
		name: 'password',
		label: 'Password',
		type: 'password',
		autoComplete: 'new-password',
		minLength: MIN_PASSWORD_LENGTH,
		hint: `At least ${MIN_PASSWORD_LENGTH} characters`,
	},
	{ name: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
]

const Register = () => {
	useDocumentTitle('Create account')
	const { register } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
	const [error, setError] = useState(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const fieldErrors = {
		...getFieldErrors(error),
		...(error === 'mismatch' && { confirm: 'Passwords do not match' }),
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
			title='Create an account'
			subtitle='Save your bag and check out faster.'
			footer={
				<>
					Already have an account?{' '}
					<Link to='/login' state={location.state}>
						Sign in
					</Link>
				</>
			}
		>
			<form className={formStyle.form} onSubmit={handleSubmit}>
				{FIELDS.map(({ name, ...field }) => (
					<TextField
						key={name}
						name={name}
						value={form[name]}
						onChange={handleChange}
						error={fieldErrors[name]}
						required
						{...field}
					/>
				))}
				{generalError && <Alert tone='error'>{getErrorMessage(error)}</Alert>}
				<Button type='submit' fullWidth disabled={isSubmitting}>
					{isSubmitting ? 'Creating account…' : 'Create account'}
				</Button>
			</form>
		</AuthCard>
	)
}

export default Register
