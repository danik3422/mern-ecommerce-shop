import { Link } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import style from './CartLine.module.css'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'
import { stockOf } from '../../utils/variants'

/** @param item `{ key, quantity, color, size, product }` from useCartItems */
const CartLine = ({ item, onQuantityChange }) => {
	const { t, formatMoney } = useI18n()
	const { product } = item
	const productUrl = `/product/${product.slug}`
	const stock = stockOf(item.variant, item.size)
	const options = [item.color && colorName(t, item.color), item.size].filter(Boolean).join(' · ')

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
				{item.quantity > 1 && (
					<p className={style.options}>{t('bag.each', { price: formatMoney(product.price) })}</p>
				)}
				{stock > 0 && stock === item.quantity && (
					<p className={style.options}>{t('bag.maxReached', { count: stock })}</p>
				)}
				{stock < item.quantity && <p className={style.warning}>{t('bag.notEnoughStock')}</p>}

				<div className={style.controls}>
					<QuantityStepper
						value={item.quantity}
						onChange={(quantity) => onQuantityChange(item.key, quantity)}
						max={Math.min(MAX_QUANTITY, stock)}
						label={t('bag.quantityOf', { title: product.title })}
					/>
					<Button variant='ghost' size='sm' onClick={() => onQuantityChange(item.key, 0)}>
						{t('bag.remove')}
					</Button>
				</div>
			</div>
		</li>
	)
}

export default CartLine
