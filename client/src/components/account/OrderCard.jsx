import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { accountKeys } from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { cancelOrder, payOrder } from '../../api/orders'
import { cx } from '../../utils/cx'
import ReturnSection from '../orders/ReturnSection'
import Button from '../ui/Button'
import shared from './Account.module.css'
import style from './OrderCard.module.css'
import OrderStatusBadge from './OrderStatusBadge'
import { useI18n } from '../../i18n/useI18n'
import { colorName } from '../../i18n/catalogText'
import { useConfirm } from '../ui/confirm/useConfirm'
import { useToast } from '../ui/toast/useToast'

/** Short, human-friendly order number from the Mongo id. */
const orderNumber = (order) => order._id.slice(-8).toUpperCase()

const OrderCard = ({ order }) => {
	const { t, formatMoney, formatDate } = useI18n()
	const queryClient = useQueryClient()
	const detailsId = useId()
	const [isOpen, setIsOpen] = useState(false)
	const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

	const toast = useToast()
	const confirm = useConfirm()
	const showError = (error) => toast.show({ tone: 'error', message: getErrorMessage(error) })
	const number = orderNumber(order)

	const payment = useMutation({
		mutationFn: () => payOrder(order._id),
		onSuccess: ({ checkoutUrl }) => {
			if (checkoutUrl) window.location.assign(checkoutUrl)
			else toast.show({ message: t('orders.noOnlinePayment') })
		},
		onError: showError,
	})

	const cancellation = useMutation({
		mutationFn: () => cancelOrder(order._id),
		onSuccess: () => {
			toast.show({ tone: 'success', message: t('orders.cancelled', { number }) })
			return queryClient.invalidateQueries({ queryKey: accountKeys.orders })
		},
		onError: showError,
	})

	const handleCancel = async () => {
		const confirmed = await confirm({
			title: t('orders.confirmCancelTitle', { number }),
			message: t('orders.confirmCancel'),
			confirmLabel: t('checkout.cancelOrder'),
			cancelLabel: t('orders.keepOrder'),
			tone: 'danger',
		})
		if (confirmed) cancellation.mutate()
	}

	return (
		<li className={cx(shared.card, style.order)}>
			<div className={style.summary}>
				<div className={style.meta}>
					<p className={style.number}>{t('checkout.order', { number: orderNumber(order) })}</p>
					<p className={shared.muted}>
						<time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time> ·{' '}
						{t('bag.count', { count: itemCount })} · {formatMoney(order.amount)}
					</p>
				</div>
				<OrderStatusBadge status={order.status} />
				<Link to={`/account/orders/${order._id}`} className={style.track}>
					{t('tracking.trackOrder')}
				</Link>
				<button
					type='button'
					className={style.toggle}
					onClick={() => setIsOpen((open) => !open)}
					aria-expanded={isOpen}
					aria-controls={detailsId}
				>
					{isOpen ? t('orders.hideDetails') : t('orders.details')}
					<ChevronDown size={16} aria-hidden className={cx(style.chevron, isOpen && style.open)} />
				</button>
			</div>

			<ul role='list' className={style.thumbnails} aria-label={t('orders.items')}>
				{order.items.map((item, index) => (
					<li key={index}>
						<img src={item.image} alt={item.title} className={style.thumbnail} loading='lazy' />
					</li>
				))}
			</ul>

			{order.status === 'pending' && (
				<div className={shared.actions}>
					<Button size='sm' onClick={() => payment.mutate()} disabled={payment.isPending}>
						{payment.isPending ? t('checkout.openingPayment') : t('orders.payNow')}
					</Button>
					<Button
						size='sm'
						variant='secondary'
						onClick={handleCancel}
						disabled={cancellation.isPending}
					>
						{t('checkout.cancelOrder')}
					</Button>
				</div>
			)}
			<ReturnSection
				order={order}
				onChange={() => queryClient.invalidateQueries({ queryKey: accountKeys.orders })}
			/>

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
									{[
										item.color && colorName(t, item.color),
										item.size,
										t('bag.qty', { count: item.quantity }),
									]
										.filter(Boolean)
										.join(' · ')}
								</p>
							</div>
							<p className={style.price}>{formatMoney(item.price * item.quantity)}</p>
						</li>
					))}
				</ul>

				<div className={style.footer}>
					<div>
						<h3 className='eyebrow'>{t('address.legend')}</h3>
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
							<dt>{t('summary.subtotal')}</dt>
							<dd>{formatMoney(order.subtotal)}</dd>
						</div>
						<div>
							<dt>{t('delivery.shipping')}</dt>
							<dd>{order.shipping ? formatMoney(order.shipping) : t('shipping.free')}</dd>
						</div>
						<div className={style.total}>
							<dt>{t('summary.total')}</dt>
							<dd>{formatMoney(order.amount)}</dd>
						</div>
					</dl>
				</div>
			</div>
		</li>
	)
}

export default OrderCard
