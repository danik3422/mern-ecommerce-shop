import { Link } from 'react-router'
import { lineKey } from '../../cart/cartLines'
import { calculateTotals } from '../../cart/pricing'
import { useCartItems } from '../../cart/useCartItems'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import Button from '../ui/Button'
import Drawer from '../ui/Drawer'
import FreeShippingProgress from './FreeShippingProgress'
import style from './MiniBag.module.css'

/**
 * Side panel shown after adding to the bag: the bag contents with the new line
 * highlighted, the subtotal and the way to checkout — without leaving the page.
 * @param addedLine the line that was just added `{ productId, size, color }`
 */
const MiniBag = ({ addedLine, onClose }) => {
	const { items } = useCartItems()
	const addedKey = addedLine && lineKey(addedLine)
	const { subtotal } = calculateTotals(
		items.map((item) => ({ price: item.product.price, quantity: item.quantity })),
	)

	return (
		<Drawer
			title='Added to your bag'
			onClose={onClose}
			closeLabel='Close bag'
			footer={
				<div className={style.footer}>
					<p className={style.subtotal}>
						<span>Subtotal</span>
						<span>{formatMoney(subtotal)}</span>
					</p>
					<Button as={Link} to='/cart' fullWidth onClick={onClose}>
						Go to checkout
					</Button>
					<Button variant='secondary' fullWidth onClick={onClose}>
						Continue shopping
					</Button>
				</div>
			}
		>
			<FreeShippingProgress subtotal={subtotal} />
			<ul role='list' className={style.items}>
				{items.map((item) => (
					<li
						key={item.key}
						className={style.item}
						aria-current={item.key === addedKey ? 'true' : undefined}
					>
						<img className={style.image} src={item.variant.images[0]} alt='' />
						<div className={style.details}>
							<p className={style.brand}>{item.product.brand}</p>
							<p>{item.product.title}</p>
							<p className={style.meta}>
								{[item.color && capitalize(item.color), item.size, `Qty ${item.quantity}`]
									.filter(Boolean)
									.join(' · ')}
							</p>
						</div>
						<p className={style.price}>{formatMoney(item.product.price * item.quantity)}</p>
					</li>
				))}
			</ul>
		</Drawer>
	)
}

export default MiniBag
