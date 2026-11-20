import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import AuthCard from '../components/auth/AuthCard'
import formStyle from '../components/auth/AuthForm.module.css'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const LogIn = () => {
	useDocumentTitle('Sign in')
	const { login } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ login: '', password: '' })
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setIsSubmitting(true)
		try {
			await login(form)
			navigate(location.state?.from ?? '/', { replace: true })
		} catch (err) {
			setError(getErrorMessage(err))
			setIsSubmitting(false)
		}
	}

	return (
		<AuthCard
			title='Sign in'
			subtitle='Welcome back.'
			footer={
				<>
					New here?{' '}
					<Link to='/register' state={location.state}>
						Create an account
					</Link>
				</>
			}
		>
			<form className={formStyle.form} onSubmit={handleSubmit}>
				<TextField
					label='Username or email'
					name='login'
					autoComplete='username'
					value={form.login}
					onChange={handleChange}
					required
				/>
				<TextField
					label='Password'
					name='password'
					type='password'
					autoComplete='current-password'
					value={form.password}
					onChange={handleChange}
					required
				/>
				{error && <Alert tone='error'>{error}</Alert>}
				<Button type='submit' fullWidth disabled={isSubmitting}>
					{isSubmitting ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>
		</AuthCard>
	)
}

export default LogIn
