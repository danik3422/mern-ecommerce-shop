import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api'
import { useAuth } from '../context/AuthContext'

const LogIn = () => {
	const { login } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ username: '', password: '' })
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			await login(form.username.trim(), form.password)
			navigate(location.state?.from || '/', { replace: true })
		} catch (err) {
			setError(getErrorMessage(err))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='login'>
			<div className='login__wrapper'>
				<h1 className='login__title'>Sign in</h1>
				<form className='login__form' onSubmit={handleSubmit}>
					<input
						className='login__input'
						name='username'
						placeholder='Username or email'
						autoComplete='username'
						value={form.username}
						onChange={handleChange}
						required
					/>
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
					{error && <p className='form-error'>{error}</p>}
					<button className='login__btn' disabled={loading}>
						{loading ? 'Signing in…' : 'Log in'}
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
		</div>
	)
}

export default LogIn
