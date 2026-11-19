import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'

const MIN_PASSWORD_LENGTH = 8

const FIELDS = [
	{ name: 'username', label: 'Username', autoComplete: 'username', minLength: 3 },
	{ name: 'email', label: 'Email address', type: 'email', autoComplete: 'email' },
	{
		name: 'password',
		label: `Password (at least ${MIN_PASSWORD_LENGTH} characters)`,
		type: 'password',
		autoComplete: 'new-password',
		minLength: MIN_PASSWORD_LENGTH,
	},
	{ name: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
]

const Register = () => {
	const { register } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (form.password !== form.confirm) return setError('Passwords do not match')

		setError('')
		setIsSubmitting(true)
		try {
			const { username, email, password } = form
			await register({ username, email, password })
			navigate(location.state?.from ?? '/', { replace: true })
		} catch (err) {
			setError(getErrorMessage(err))
			setIsSubmitting(false)
		}
	}

	return (
		<main className='register'>
			<div className='register__wrapper'>
				<div className='register__header'>
					<h1 className='register__title'>Create an account</h1>
					<p className='register__text'>
						Already have an account?{' '}
						<Link className='register__link' to='/login' state={location.state}>
							<span>Sign in!</span>
						</Link>
					</p>
				</div>

				<form className='register__form' onSubmit={handleSubmit}>
					{FIELDS.map(({ name, label, type = 'text', autoComplete, minLength }) => (
						<label key={name}>
							<span className='visually-hidden'>{label}</span>
							<input
								className='register__input'
								name={name}
								type={type}
								placeholder={label}
								autoComplete={autoComplete}
								minLength={minLength}
								value={form[name]}
								onChange={handleChange}
								required
							/>
						</label>
					))}
					<p className='register__agreement'>
						By registering for an account, you agree to our
						<span> Terms of Use.</span> <br /> Please read our
						<span> Privacy Notice.</span>
					</p>
					{error && (
						<p className='form-error' role='alert'>
							{error}
						</p>
					)}
					<button className='register__btn' disabled={isSubmitting}>
						{isSubmitting ? 'Creating…' : 'Create'}
					</button>
				</form>
			</div>
		</main>
	)
}

export default Register
