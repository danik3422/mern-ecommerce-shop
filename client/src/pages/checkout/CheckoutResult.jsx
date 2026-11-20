import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { cancelOrder, fetchOrder, orderKeys, payOrder } from '../../api/orders'
import { useAuth } from '../../auth/useAuth'
import { redirectToPayment } from '../../cart/redirect'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import style from './CheckoutResult.module.css'
import OrderReview from './OrderReview'

// Stripe usually confirms within seconds; after ~16 s the page stops waiting
const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 8

const isAwaitingOnlinePayment = (order) =>
	order?.status === 'pending' && order.payment?.provider === 'stripe'

/** Heading, text and icon for the order state. */
const describe = (order, { result, isPolling }) => {
	if (order.status === 'cancelled') {
		return {
			icon: XCircle,
			tone: 'muted',
			title: 'This order was cancelled',
			text: 'Nothing was charged and the items are back in stock.',
		}
	}
	if (order.status !== 'pending') {
		return {
			icon: CheckCircle2,
			tone: 'success',
			title: 'Thank you for your order',
			text: 'Your payment was received. We will let you know when your order ships.',
		}
	}
	if (order.payment?.provider !== 'stripe') {
		return {
			icon: CheckCircle2,
			tone: 'success',
			title: 'Thank you for your order',
			text: 'Your order is placed. Online payment is not set up in this shop yet, so payment is collected on delivery.',
		}
	}
	if (result === 'cancel') {
		return {
			icon: Clock,
			tone: 'muted',
			title: 'Payment was not completed',
			text: 'Your order is saved and the items are reserved for a while. You can try paying again or cancel the order.',
		}
	}
	if (isPolling) {
		return {
			icon: Loader2,
			tone: 'spin',
			title: 'Confirming your payment…',
			text: 'This usually takes a few seconds.',
		}
	}
	return {
		icon: Clock,
		tone: 'muted',
		title: 'Payment pending',
		text: 'We have not received the confirmation from the payment provider yet. Check your orders again in a few minutes.',
	}
}

/**
 * /checkout/success and /checkout/cancel — Stripe Checkout returns here
 * (and orders without online payment land on the success page directly).
 * @param result 'success' | 'cancel'
 */
const CheckoutResult = ({ result }) => {
	useDocumentTitle(result === 'success' ? 'Order confirmation' : 'Payment not completed')
	const { user } = useAuth()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const orderId = searchParams.get('order')
	const queryClient = useQueryClient()

	// on the success page, keep reloading a pending order until the Stripe webhook marks it paid
	const isPolling = (queryState) =>
		result === 'success' &&
		isAwaitingOnlinePayment(queryState?.data) &&
		queryState.dataUpdateCount < MAX_POLLS

	const order = useQuery({
		queryKey: orderKeys.detail(orderId),
		queryFn: ({ signal }) => fetchOrder(orderId, signal),
		enabled: Boolean(orderId && user),
		refetchInterval: (query) => (isPolling(query.state) ? POLL_INTERVAL_MS : false),
	})

	const pay = useMutation({
		mutationFn: () => payOrder(orderId),
		onSuccess: ({ checkoutUrl }) => redirectToPayment(checkoutUrl),
	})
	const cancel = useMutation({
		mutationFn: () => cancelOrder(orderId),
		onSuccess: (cancelled) => queryClient.setQueryData(orderKeys.detail(orderId), cancelled),
	})

	const shopLink = (
		<Button as={Link} to='/products' variant='secondary'>
			Continue shopping
		</Button>
	)

	if (!orderId) {
		return (
			<EmptyState title='Order not found' action={shopLink}>
				The link is missing the order number.
			</EmptyState>
		)
	}

	if (!user) {
		return (
			<EmptyState
				title='Sign in to see your order'
				action={
					<Button as={Link} to='/login' state={{ from: location.pathname + location.search }}>
						Sign in
					</Button>
				}
			/>
		)
	}

	if (order.isPending) {
		return <EmptyState title='Loading your order…' />
	}

	if (order.isError) {
		const notFound = [400, 404].includes(order.error.response?.status)
		return (
			<EmptyState title={notFound ? 'Order not found' : 'Something went wrong'} action={shopLink}>
				{notFound
					? 'This order does not exist or belongs to another account.'
					: getErrorMessage(order.error)}
			</EmptyState>
		)
	}

	const data = order.data
	// reading dataUpdatedAt re-renders the page after every poll, even when the order is unchanged,
	// so the page stops showing "Confirming…" once polling ends
	const waiting =
		order.dataUpdatedAt > 0 && isPolling(queryClient.getQueryState(orderKeys.detail(orderId)))
	const { icon: Icon, tone, title, text } = describe(data, { result, isPolling: waiting })
	const canRetryPayment = isAwaitingOnlinePayment(data) && !waiting
	const canCancel = data.status === 'pending' && (result === 'cancel' || canRetryPayment)
	const actionError = pay.error ?? cancel.error

	return (
		<div className={cx('container', style.page)}>
			<div className={style.status} role='status'>
				<Icon size={36} aria-hidden className={cx(style.icon, style[tone])} />
				<h1 className={style.title}>{title}</h1>
				<p className={style.text}>{text}</p>
			</div>

			{actionError && <Alert tone='error'>{getErrorMessage(actionError)}</Alert>}

			<div className={style.actions}>
				{canRetryPayment && (
					<Button onClick={() => pay.mutate()} disabled={pay.isPending || cancel.isPending}>
						{pay.isPending ? 'Opening payment…' : 'Try payment again'}
					</Button>
				)}
				{canCancel && (
					<Button
						variant='secondary'
						onClick={() => cancel.mutate()}
						disabled={pay.isPending || cancel.isPending}
					>
						{cancel.isPending ? 'Cancelling…' : 'Cancel order'}
					</Button>
				)}
				{!canRetryPayment && shopLink}
				<Button as={Link} to='/account' variant='ghost'>
					My orders
				</Button>
			</div>

			<OrderReview order={data} />
		</div>
	)
}

export default CheckoutResult
