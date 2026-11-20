import { cx } from '../../utils/cx'
import shared from './Account.module.css'
import style from './OrderStatusBadge.module.css'

const LABELS = {
	pending: 'Awaiting payment',
	paid: 'Paid',
	shipped: 'Shipped',
	delivered: 'Delivered',
	cancelled: 'Cancelled',
}

const OrderStatusBadge = ({ status }) => (
	<span className={cx(shared.badge, style[status])}>{LABELS[status] ?? status}</span>
)

export default OrderStatusBadge
