import style from './OrderReview.module.css'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'

/** Short, human-friendly order number derived from the id. */
const orderNumber = (order) => order._id.slice(-8).toUpperCase()

// non-breaking spaces keep "Size M" and "Qty 2" together on narrow screens
const keepTogether = (text) => text.replaceAll(' ', '\u00a0')

/** "Black · Size M · Qty 2" */
const describeItem = (t, item) =>
	[
		item.color && colorName(t, item.color),
		keepTogether(item.size === 'One size' ? t('bag.oneSize') : t('bag.size', { size: item.size })),
		keepTogether(t('bag.qty', { count: item.quantity })),
	]
		.filter(Boolean)
		.join(' · ')

/** Items, totals and shipping address of a placed order. */
const OrderReview = ({ order }) => {
	const { t, formatMoney, formatDate } = useI18n()
	return (
		<section className={style.review} aria-labelledby='order-review-title'>
			<div className={style.heading}>
				<h2 id='order-review-title' className={style.title}>
					{t('checkout.order', { number: orderNumber(order) })}
				</h2>
				<p className={style.muted}>{formatDate(order.createdAt)}</p>
			</div>

			<ul role='list' className={style.items}>
				{order.items.map((item, index) => (
					<li
						key={`${item.productId}-${item.size}-${item.color ?? ''}-${index}`}
						className={style.item}
					>
						<img className={style.image} src={item.image} alt='' loading='lazy' />
						<div className={style.itemText}>
							<p>
								<span className={style.brand}>{item.brand}</span> {item.title}
							</p>
							<p className={style.muted}>{describeItem(t, item)}</p>
						</div>
						<p className={style.price}>{formatMoney(item.price * item.quantity)}</p>
					</li>
				))}
			</ul>

			<div className={style.footer}>
				<div>
					<h3 className={style.subtitle}>{t('checkout.shippingTo')}</h3>
					<address className={style.address}>
						{order.address.fullName}
						<br />
						{order.address.street}
						<br />
						{order.address.postalCode} {order.address.city}
						<br />
						{order.address.country}
					</address>
				</div>
				<dl className={style.totals}>
					<div className={style.row}>
						<dt>{t('summary.subtotal')}</dt>
						<dd>{formatMoney(order.subtotal)}</dd>
					</div>
					{order.discount > 0 && (
						<div className={style.row}>
							<dt>
								{order.promoCode
									? t('summary.discountWithCode', { code: order.promoCode })
									: t('summary.discount')}
							</dt>
							<dd>−{formatMoney(order.discount)}</dd>
						</div>
					)}
					<div className={style.row}>
						<dt>
							{t(`delivery.${order.shippingMethod?.id ?? 'shipping'}`, {
								defaultValue: order.shippingMethod?.label,
							})}
						</dt>
						<dd>{order.shipping ? formatMoney(order.shipping) : t('shipping.free')}</dd>
					</div>
					<div className={`${style.row} ${style.total}`}>
						<dt>{t('summary.total')}</dt>
						<dd>{formatMoney(order.amount)}</dd>
					</div>
				</dl>
			</div>
		</section>
	)
}

export default OrderReview
