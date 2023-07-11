import style from './CheckoutBtn.module.css'
const CheckoutBtn = (props) => {
	return (
		<button
			className={style.btn}
			style={
				props.type === 'filled'
					? { backgroundColor: 'black', color: 'white', border: 'none' }
					: { backgroundColor: 'transparent' }
			}
		>
			{props.children}
		</button>
	)
}
export default CheckoutBtn
