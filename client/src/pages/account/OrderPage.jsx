import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { accountKeys } from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { cancelOrder, fetchOrder, orderKeys, payOrder } from '../../api/orders'
import { redirectToPayment } from '../../cart/redirect'
import shared from '../../components/account/Account.module.css'
import OrderStatusBadge from '../../components/account/OrderStatusBadge'
import OrderProgress from '../../components/orders/OrderProgress'
import ReturnSection from '../../components/orders/ReturnSection'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirm/useConfirm'
import { useToast } from '../../components/ui/toast/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useI18n } from '../../i18n/useI18n'
import OrderReview from '../checkout/OrderReview'
import style from './OrderPage.module.css'

/** Short, human-friendly order number from the Mongo id. */
const orderNumber = (id) => id.slice(-8).toUpperCase()

/**
 * /account/orders/:id — one order of the signed-in customer: the tracking timeline,
 * expected delivery, invoice, items and totals, with paying, cancelling and returns.
 */
const OrderPage = () => {
	const { id } = useParams()
	const { t, formatDate } = useI18n()
	const number = orderNumber(id)
	useDocumentTitle(t('tracking.title', { number }))
	const queryClient = useQueryClient()
	const toast = useToast()
	const confirm = useConfirm()

	const order = useQuery({
		queryKey: orderKeys.detail(id),
		queryFn: ({ signal }) => fetchOrder(id, signal),
	})

	const updated = (next) => {
		queryClient.setQueryData(orderKeys.detail(id), (current) => ({ ...current, ...next }))
		return queryClient.invalidateQueries({ queryKey: accountKeys.orders })
	}
	const showError = (error) => toast.show({ tone: 'error', message: getErrorMessage(error) })

	const payment = useMutation({
		mutationFn: () => payOrder(id),
		onSuccess: ({ checkoutUrl }) => {
			if (checkoutUrl) redirectToPayment(checkoutUrl)
			else toast.show({ message: t('orders.noOnlinePayment') })
		},
		onError: showError,
	})
	const cancellation = useMutation({
		mutationFn: () => cancelOrder(id),
		onSuccess: (cancelled) => {
			toast.show({ tone: 'success', message: t('orders.cancelled', { number }) })
			return updated(cancelled)
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

	const backLink = (
		<Link to='/account' className={style.back}>
			<ArrowLeft size={14} aria-hidden /> {t('tracking.backToOrders')}
		</Link>
	)

	if (order.isPending) {
		return (
			<section className={shared.section}>
				{backLink}
				<p className={shared.muted}>{t('tracking.loading')}</p>
			</section>
		)
	}
	if (order.isError) {
		const missing = [400, 404].includes(order.error.response?.status)
		return (
			<section className={shared.section}>
				{backLink}
				<Alert tone='error'>
					{missing ? t('tracking.notFound') : getErrorMessage(order.error)}
				</Alert>
			</section>
		)
	}

	const data = order.data
	return (
		<section className={shared.section} aria-labelledby='order-title'>
			{backLink}
			<header className={style.header}>
				<div>
					<h1 id='order-title' className={shared.title}>
						{t('tracking.title', { number })}
					</h1>
					<p className={shared.muted}>
						{t('tracking.placedOn', { date: formatDate(data.createdAt) })}
					</p>
				</div>
				<OrderStatusBadge status={data.status} />
			</header>

			{data.status === 'pending' && (
				<div className={shared.actions}>
					<Button
						size='sm'
						onClick={() => payment.mutate()}
						disabled={payment.isPending || cancellation.isPending}
					>
						{payment.isPending ? t('checkout.openingPayment') : t('orders.payNow')}
					</Button>
					<Button
						size='sm'
						variant='secondary'
						onClick={handleCancel}
						disabled={payment.isPending || cancellation.isPending}
					>
						{cancellation.isPending ? t('checkout.cancelling') : t('checkout.cancelOrder')}
					</Button>
				</div>
			)}
			<ReturnSection order={data} onChange={updated} />

			<div className={style.layout}>
				<OrderProgress order={data} />
				<OrderReview order={data} />
			</div>
		</section>
	)
}

export default OrderPage
