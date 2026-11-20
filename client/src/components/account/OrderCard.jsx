import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { accountKeys } from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { cancelOrder, payOrder } from '../../api/orders'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import { cx } from '../../utils/cx'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import shared from './Account.module.css'
import style from './OrderCard.module.css'
import OrderStatusBadge from './OrderStatusBadge'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

/** Short, human-friendly order number from the Mongo id. */
const orderNumber = (order) => order._id.slice(-8).toUpperCase()

const OrderCard = ({ order }) => {
	const queryClient = useQueryClient()
	const detailsId = useId()
	const [isOpen, setIsOpen] = useState(false)
	const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

	const payment = useMutation({
		mutationFn: () => payOrder(order._id),
		onSuccess: ({ checkoutUrl }) => {
			if (checkoutUrl) window.location.assign(checkoutUrl)
		},
	})

	const cancellation = useMutation({
		mutationFn: () => cancelOrder(order._id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.orders }),
	})

	const handleCancel = () => {
		if (window.confirm(`Cancel order #${orderNumber(order)}? This cannot be undone.`)) {
			cancellation.mutate()
		}
	}

	const error = payment.error ?? cancellation.error

	return (
		<li className={cx(shared.card, style.order)}>
			<div className={style.summary}>
				<div className={style.meta}>
					<p className={style.number}>Order #{orderNumber(order)}</p>
					<p className={shared.muted}>
						<time dateTime={order.createdAt}>
							{dateFormatter.format(new Date(order.createdAt))}
						</time>{' '}
						· {itemCount} {itemCount === 1 ? 'item' : 'items'} · {formatMoney(order.amount)}
					</p>
				</div>
				<OrderStatusBadge status={order.status} />
				<button
					type='button'
					className={style.toggle}
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-controls={detailsId}
				>
					{isOpen ? 'Hide details' : 'Details'}
					<ChevronDown size={16} aria-hidden className={cx(style.chevron, isOpen && style.open)} />
				</button>
			</div>

			<ul role='list' className={style.thumbnails} aria-label='Items'>
				{order.items.map((item, index) => (
					<li key={index}>
						<img src={item.image} alt={item.title} className={style.thumbnail} loading='lazy' />
					</li>
				))}
			</ul>

			{order.status === 'pending' && (
				<div className={shared.actions}>
					<Button size='sm' onClick={() => payment.mutate()} disabled={payment.isPending}>
						{payment.isPending ? 'Opening payment…' : 'Pay now'}
					</Button>
					<Button
						size='sm'
						variant='secondary'
						onClick={handleCancel}
						disabled={cancellation.isPending}
					>
						Cancel order
					</Button>
				</div>
			)}
			{payment.isSuccess && !payment.data?.checkoutUrl && (
				<Alert>Online payment is not available yet. We will contact you about payment.</Alert>
			)}
			{error && <Alert tone='error'>{getErrorMessage(error)}</Alert>}

			<div id={detailsId} hidden={!isOpen} className={style.details}>
				<ul role='list' className={style.items}>
					{order.items.map((item, index) => (
						<li key={index} className={style.item}>
							<img src={item.image} alt='' className={style.itemImage} loading='lazy' />
							<div>
								<p>
									<span className={style.brand}>{item.brand}</span> {item.title}
								</p>
								<p className={shared.muted}>
									{[item.color && capitalize(item.color), item.size].filter(Boolean).join(' · ')} ·
									Qty {item.quantity}
								</p>
							</div>
							<p className={style.price}>{formatMoney(item.price * item.quantity)}</p>
						</li>
					))}
				</ul>

				<div className={style.footer}>
					<div>
						<h3 className='eyebrow'>Shipping address</h3>
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
						<div>
							<dt>Subtotal</dt>
							<dd>{formatMoney(order.subtotal)}</dd>
						</div>
						<div>
							<dt>Shipping</dt>
							<dd>{order.shipping ? formatMoney(order.shipping) : 'Free'}</dd>
						</div>
						<div className={style.total}>
							<dt>Total</dt>
							<dd>{formatMoney(order.amount)}</dd>
						</div>
					</dl>
				</div>
			</div>
		</li>
	)
}

export default OrderCard
