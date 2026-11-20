import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import shared from './Account.module.css'
import style from './OrderStatusBadge.module.css'

const OrderStatusBadge = ({ status }) => {
	const { t } = useI18n()
	return (
		<span className={cx(shared.badge, style[status])}>
			{t(`orderStatus.${status}`, { defaultValue: status })}
		</span>
	)
}

export default OrderStatusBadge
