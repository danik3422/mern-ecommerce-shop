const Register = () => {
	return (
		<div className='register'>
			<div className='register__wrapper'>
				<h1 className='register__title'>Create an account</h1>
				<form className='register__form'>
					<input className='register__input' placeholder='First name' />
					<input className='register__input' placeholder='Last name' />
					<input className='register__input' placeholder='Email address' />
					<input className='register__input' placeholder='Password' />
					<input className='register__input' placeholder='Confirm password' />
					<p className='register__agreement'>
						By registering for an account, you agree to our
						<span> Terms of Use.</span> <br /> Please read our
						<span> Privacy Notice.</span>
					</p>
					<button className='register__btn'>Create</button>
				</form>
			</div>
		</div>
	)
}

export default Register
