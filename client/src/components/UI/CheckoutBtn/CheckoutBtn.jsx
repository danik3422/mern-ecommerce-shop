import style from './CheckoutBtn.module.css'

const CheckoutBtn = ({ type, children, ...rest }) => {
	return (
		<button
			type='button'
			className={style.btn}
			style={
				type === 'filled'
					? { backgroundColor: 'black', color: 'white', border: 'none' }
					: { backgroundColor: 'transparent', border: '1px solid black' }
			}
			{...rest}
		>
			{children}
		</button>
	)
}

export default CheckoutBtn
