import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { accountKeys, fetchMyOrders } from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import shared from '../../components/account/Account.module.css'
import OrderCard from '../../components/account/OrderCard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useI18n } from '../../i18n/useI18n'

const OrdersPage = () => {
	const { t } = useI18n()
	useDocumentTitle(t('orders.title'))
	const { user } = useAuth()
	const orders = useQuery({ queryKey: [...accountKeys.orders, user._id], queryFn: fetchMyOrders })

	return (
		<section className={shared.section} aria-labelledby='orders-title'>
			<h1 id='orders-title' className={shared.title}>
				{t('account.orders')}
			</h1>

			{orders.isPending && <p className={shared.muted}>{t('orders.loading')}</p>}
			{orders.isError && (
				<Alert tone='error'>
					{t('orders.loadError', { error: getErrorMessage(orders.error) })}
				</Alert>
			)}
			{orders.data?.length === 0 && (
				<div className={shared.card}>
					<p>{t('orders.empty')}</p>
					<Button
						as={Link}
						to='/products'
						variant='secondary'
						size='sm'
						className={shared.cardAction}
					>
						{t('orders.startShopping')}
					</Button>
				</div>
			)}
			{orders.data?.length > 0 && (
				<ul role='list' className={shared.section}>
					{orders.data.map((order) => (
						<OrderCard key={order._id} order={order} />
					))}
				</ul>
			)}
		</section>
	)
}

export default OrdersPage
