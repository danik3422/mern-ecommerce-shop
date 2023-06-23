const LogIn = () => {
	return (
		<div className='login'>
			<div className='login__wrapper'>
				<h1 className='login__title'>Sign in</h1>
				<form className='login__form'>
					<input className='login__input' placeholder='Email address' />
					<input className='login__input' placeholder='Password' />
					<button className='login__btn'>Log in</button>
					<div className='login__links'>
						<a className='login__link' href='!#'>
							Forgotten your password?
						</a>
						<a className='login__link' href='/register'>
							Create a new account
						</a>
					</div>
				</form>
			</div>
		</div>
	)
}

export default LogIn
