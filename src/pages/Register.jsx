import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api'
import { useAuth } from '../context/AuthContext'

const Register = () => {
	const { register } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

	const handleSubmit = async (e) => {
		e.preventDefault()
		if (form.password !== form.confirm) return setError('Passwords do not match')
		setError('')
		setLoading(true)
		try {
			await register({
				username: form.username.trim(),
				email: form.email.trim(),
				password: form.password,
			})
			navigate(location.state?.from || '/', { replace: true })
		} catch (err) {
			setError(getErrorMessage(err))
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='register'>
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
					<input
						className='register__input'
						name='username'
						placeholder='Username'
						autoComplete='username'
						value={form.username}
						onChange={handleChange}
						required
					/>
					<input
						className='register__input'
						name='email'
						type='email'
						placeholder='Email address'
						autoComplete='email'
						value={form.email}
						onChange={handleChange}
						required
					/>
					<input
						className='register__input'
						name='password'
						type='password'
						placeholder='Password (min 6 characters)'
						autoComplete='new-password'
						minLength={6}
						value={form.password}
						onChange={handleChange}
						required
					/>
					<input
						className='register__input'
						name='confirm'
						type='password'
						placeholder='Confirm password'
						autoComplete='new-password'
						value={form.confirm}
						onChange={handleChange}
						required
					/>
					<p className='register__agreement'>
						By registering for an account, you agree to our
						<span> Terms of Use.</span> <br /> Please read our
						<span> Privacy Notice.</span>
					</p>
					{error && <p className='form-error'>{error}</p>}
					<button className='register__btn' disabled={loading}>
						{loading ? 'Creating…' : 'Create'}
					</button>
				</form>
			</div>
		</div>
	)
}

export default Register
