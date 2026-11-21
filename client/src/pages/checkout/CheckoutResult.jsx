import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { cancelOrder, fetchOrder, orderKeys, payOrder } from '../../api/orders'
import { useAuth } from '../../auth/useAuth'
import { redirectToPayment } from '../../cart/redirect'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import style from './CheckoutResult.module.css'
import OrderReview from './OrderReview'
import ReturnSection from '../../components/orders/ReturnSection'
import { useI18n } from '../../i18n/useI18n'
import { useConfirm } from '../../components/ui/confirm/useConfirm'
import { useToast } from '../../components/ui/toast/useToast'

// Stripe usually confirms within seconds; after ~16 s the page stops waiting
const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 8

const isAwaitingOnlinePayment = (order) =>
	order?.status === 'pending' && order.payment?.provider === 'stripe'

/** Icon and message key (`checkout.states.*`) for the order state. */
const describe = (order, { result, isPolling }) => {
	if (order.status === 'cancelled') return { icon: XCircle, tone: 'muted', state: 'cancelled' }
	if (order.status !== 'pending') return { icon: CheckCircle2, tone: 'success', state: 'paid' }
	if (order.payment?.provider !== 'stripe') {
		return { icon: CheckCircle2, tone: 'success', state: 'payLater' }
	}
	if (result === 'cancel') return { icon: Clock, tone: 'muted', state: 'notCompleted' }
	if (isPolling) return { icon: Loader2, tone: 'spin', state: 'confirming' }
	return { icon: Clock, tone: 'muted', state: 'pending' }
}

/**
 * /checkout/success and /checkout/cancel — Stripe Checkout returns here
 * (and orders without online payment land on the success page directly).
 * @param result 'success' | 'cancel'
 */
const CheckoutResult = ({ result }) => {
	const { t } = useI18n()
	useDocumentTitle(result === 'success' ? t('checkout.titleSuccess') : t('checkout.titleCancel'))
	const { user } = useAuth()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const orderId = searchParams.get('order')
	// guests come back with their order token (from the bag, Stripe or an email link)
	const token = searchParams.get('token') ?? undefined
	const queryClient = useQueryClient()

	// on the success page, keep reloading a pending order until the Stripe webhook marks it paid
	const isPolling = (queryState) =>
		result === 'success' &&
		isAwaitingOnlinePayment(queryState?.data) &&
		queryState.dataUpdateCount < MAX_POLLS

	const order = useQuery({
		queryKey: orderKeys.detail(orderId),
		queryFn: ({ signal }) => fetchOrder(orderId, signal, token),
		// customers load their order with their session, guests with the token from the link
		enabled: Boolean(orderId && (user || token)),
		refetchInterval: (query) => (isPolling(query.state) ? POLL_INTERVAL_MS : false),
	})

	const toast = useToast()
	const confirm = useConfirm()
	const showError = (error) => toast.show({ tone: 'error', message: getErrorMessage(error) })

	const pay = useMutation({
		mutationFn: () => payOrder(orderId, token),
		onSuccess: ({ checkoutUrl }) => redirectToPayment(checkoutUrl),
		onError: showError,
	})
	const cancel = useMutation({
		mutationFn: () => cancelOrder(orderId, token),
		onSuccess: (cancelled) => {
			queryClient.setQueryData(orderKeys.detail(orderId), cancelled)
			toast.show({ tone: 'success', message: t('checkout.cancelled') })
		},
		onError: showError,
	})

	const handleCancel = async () => {
		const confirmed = await confirm({
			title: t('checkout.confirmCancelTitle'),
			message: t('checkout.confirmCancel'),
			confirmLabel: t('checkout.cancelOrder'),
			cancelLabel: t('orders.keepOrder'),
			tone: 'danger',
		})
		if (confirmed) cancel.mutate()
	}

	const shopLink = (
		<Button as={Link} to='/products' variant='secondary'>
			{t('bag.continueShopping')}
		</Button>
	)

	if (!orderId) {
		return (
			<EmptyState title={t('checkout.orderNotFound')} action={shopLink}>
				{t('checkout.missingNumber')}
			</EmptyState>
		)
	}

	if (!user && !token) {
		return (
			<EmptyState
				title={t('checkout.signInToSee')}
				action={
					<Button as={Link} to='/login' state={{ from: location.pathname + location.search }}>
						{t('checkout.signIn')}
					</Button>
				}
			/>
		)
	}

	if (order.isPending) {
		return <EmptyState title={t('checkout.loadingOrder')} />
	}

	if (order.isError) {
		const notFound = [400, 404].includes(order.error.response?.status)
		return (
			<EmptyState
				title={notFound ? t('checkout.orderNotFound') : t('checkout.error')}
				action={shopLink}
			>
				{notFound ? t('checkout.notYours') : getErrorMessage(order.error)}
			</EmptyState>
		)
	}

	const data = order.data
	// reading dataUpdatedAt re-renders the page after every poll, even when the order is unchanged,
	// so the page stops showing "Confirming…" once polling ends
	const waiting =
		order.dataUpdatedAt > 0 && isPolling(queryClient.getQueryState(orderKeys.detail(orderId)))
	const { icon: Icon, tone, state } = describe(data, { result, isPolling: waiting })
	const canRetryPayment = isAwaitingOnlinePayment(data) && !waiting
	const canCancel = data.status === 'pending' && (result === 'cancel' || canRetryPayment)

	return (
		<div className={cx('container', style.page)}>
			<div className={style.status} role='status'>
				<Icon size={36} aria-hidden className={cx(style.icon, style[tone])} />
				<h1 className={style.title}>{t(`checkout.states.${state}.title`)}</h1>
				<p className={style.text}>{t(`checkout.states.${state}.text`)}</p>
			</div>

			<div className={style.actions}>
				{canRetryPayment && (
					<Button onClick={() => pay.mutate()} disabled={pay.isPending || cancel.isPending}>
						{pay.isPending ? t('checkout.openingPayment') : t('checkout.retryPayment')}
					</Button>
				)}
				{canCancel && (
					<Button
						variant='secondary'
						onClick={handleCancel}
						disabled={pay.isPending || cancel.isPending}
					>
						{cancel.isPending ? t('checkout.cancelling') : t('checkout.cancelOrder')}
					</Button>
				)}
				{!canRetryPayment && shopLink}
				{user && (
					<Button as={Link} to='/account' variant='ghost'>
						{t('checkout.myOrders')}
					</Button>
				)}
			</div>

			{!user && (
				<p className={style.guestNote}>
					{t('checkout.guestNote', { email: data.email })}{' '}
					<Link to='/register' className='text-link'>
						{t('checkout.guestCreate')}
					</Link>{' '}
					{t('checkout.guestCreateBenefit')}
				</p>
			)}

			<div className={style.returns}>
				<ReturnSection
					order={data}
					token={token}
					onChange={(updated) => queryClient.setQueryData(orderKeys.detail(orderId), updated)}
				/>
			</div>
			<OrderReview order={data} />
		</div>
	)
}

export default CheckoutResult
