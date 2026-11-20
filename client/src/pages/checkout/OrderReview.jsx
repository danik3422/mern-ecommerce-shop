import { capitalize } from '../../utils/text'
import { formatMoney } from '../../utils/money'
import style from './OrderReview.module.css'

const formatDate = (date) =>
	new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(date))

/** Short, human-friendly order number derived from the id. */
const orderNumber = (order) => order._id.slice(-8).toUpperCase()

// non-breaking spaces keep "Size M" and "Qty 2" together on narrow screens
const NBSP = ' '

/** "Black · Size M · Qty 2" */
const describeItem = (item) =>
	[
		item.color && capitalize(item.color),
		item.size === 'One size' ? `One${NBSP}size` : `Size${NBSP}${item.size}`,
		`Qty${NBSP}${item.quantity}`,
	]
		.filter(Boolean)
		.join(' · ')

/** Items, totals and shipping address of a placed order. */
const OrderReview = ({ order }) => (
	<section className={style.review} aria-labelledby='order-review-title'>
		<div className={style.heading}>
			<h2 id='order-review-title' className={style.title}>
				Order #{orderNumber(order)}
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
						<p className={style.muted}>{describeItem(item)}</p>
					</div>
					<p className={style.price}>{formatMoney(item.price * item.quantity)}</p>
				</li>
			))}
		</ul>

		<div className={style.footer}>
			<div>
				<h3 className={style.subtitle}>Shipping to</h3>
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
					<dt>Subtotal</dt>
					<dd>{formatMoney(order.subtotal)}</dd>
				</div>
				<div className={style.row}>
					<dt>Shipping</dt>
					<dd>{order.shipping ? formatMoney(order.shipping) : 'Free'}</dd>
				</div>
				<div className={`${style.row} ${style.total}`}>
					<dt>Total</dt>
					<dd>{formatMoney(order.amount)}</dd>
				</div>
			</dl>
		</div>
	</section>
)

export default OrderReview
