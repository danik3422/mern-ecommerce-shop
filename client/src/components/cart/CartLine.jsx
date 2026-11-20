import { Link } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import style from './CartLine.module.css'

/** @param item `{ key, quantity, color, size, product }` from useCartItems */
const CartLine = ({ item, onQuantityChange }) => {
	const { product } = item
	const productUrl = `/product/${product.slug}`
	const options = [item.color && capitalize(item.color), item.size].filter(Boolean).join(' · ')

	return (
		<li className={style.line}>
			<Link to={productUrl} className={style.media} tabIndex={-1} aria-hidden>
				<img className={style.image} src={item.variant.images[0]} alt='' loading='lazy' />
			</Link>

			<div className={style.details}>
				<div className={style.heading}>
					<Link to={productUrl} className={style.title}>
						<span className={style.brand}>{product.brand}</span> {product.title}
					</Link>
					<p className={style.price}>{formatMoney(product.price * item.quantity)}</p>
				</div>
				{options && <p className={style.options}>{options}</p>}
				{item.quantity > 1 && <p className={style.options}>{formatMoney(product.price)} each</p>}
				{!product.inStock && (
					<p className={style.warning}>
						Not enough stock in this size — reduce the quantity or remove it
					</p>
				)}

				<div className={style.controls}>
					<QuantityStepper
						value={item.quantity}
						onChange={(quantity) => onQuantityChange(item.key, quantity)}
						max={MAX_QUANTITY}
						label={`quantity of ${product.title}`}
					/>
					<Button variant='ghost' size='sm' onClick={() => onQuantityChange(item.key, 0)}>
						Remove
					</Button>
				</div>
			</div>
		</li>
	)
}

export default CartLine
