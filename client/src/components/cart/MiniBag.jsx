import { Link } from 'react-router'
import { lineKey } from '../../cart/cartLines'
import { useCartItems } from '../../cart/useCartItems'
import Button from '../ui/Button'
import Drawer from '../ui/Drawer'
import FreeShippingProgress from './FreeShippingProgress'
import style from './MiniBag.module.css'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'

/**
 * Side panel shown after adding to the bag: the bag contents with the new line
 * highlighted, the subtotal and the way to checkout — without leaving the page.
 * @param addedLine the line that was just added `{ productId, size, color }`
 */
const MiniBag = ({ addedLine, onClose }) => {
	const { t, formatMoney } = useI18n()
	const { items } = useCartItems()
	const addedKey = addedLine && lineKey(addedLine)
	const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

	return (
		<Drawer
			title={t('bag.added')}
			onClose={onClose}
			closeLabel={t('bag.closeBag')}
			footer={
				<div className={style.footer}>
					<p className={style.subtotal}>
						<span>{t('bag.subtotal')}</span>
						<span>{formatMoney(subtotal)}</span>
					</p>
					<Button as={Link} to='/cart' fullWidth onClick={onClose}>
						{t('bag.goToCheckout')}
					</Button>
					<Button variant='secondary' fullWidth onClick={onClose}>
						{t('bag.continueShopping')}
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
								{[
									item.color && colorName(t, item.color),
									item.size,
									t('bag.qty', { count: item.quantity }),
								]
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
