import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'

const LogIn = () => {
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
		<main className='login'>
			<div className='login__wrapper'>
				<h1 className='login__title'>Sign in</h1>
				<form className='login__form' onSubmit={handleSubmit}>
					<label>
						<span className='visually-hidden'>Username or email</span>
						<input
							className='login__input'
							name='login'
							placeholder='Username or email'
							autoComplete='username'
							value={form.login}
							onChange={handleChange}
							required
						/>
					</label>
					<label>
						<span className='visually-hidden'>Password</span>
						<input
							className='login__input'
							name='password'
							type='password'
							placeholder='Password'
							autoComplete='current-password'
							value={form.password}
							onChange={handleChange}
							required
						/>
					</label>
					{error && (
						<p className='form-error' role='alert'>
							{error}
						</p>
					)}
					<button className='login__btn' disabled={isSubmitting}>
						{isSubmitting ? 'Signing in…' : 'Log in'}
					</button>
					<div className='login__links'>
						<Link className='login__link' to='/'>
							Back to shop
						</Link>
						<Link className='login__link' to='/register' state={location.state}>
							Create a new account
						</Link>
					</div>
				</form>
			</div>
		</main>
	)
}

export default LogIn
