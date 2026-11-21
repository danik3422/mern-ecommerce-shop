import { RotateCcw, Timer, Truck } from 'lucide-react'
import { useShopConfig } from '../../hooks/useShopConfig'
import { useI18n } from '../../i18n/useI18n'
import style from './DeliveryInfo.module.css'

/** Free delivery threshold, delivery times and the return window from the shop settings. */
const DeliveryInfo = () => {
	const config = useShopConfig()
	const { t, formatMoney } = useI18n()
	if (!config) return null

	const days = config.shippingMethods?.flatMap((method) => method.days ?? []) ?? []
	const items = [
		// no free delivery threshold set in the admin settings → no line
		config.freeShippingFrom > 0 && {
			icon: Truck,
			text: t('product.freeDelivery', { amount: formatMoney(config.freeShippingFrom) }),
		},
		days.length > 0 && {
			icon: Timer,
			text: t('product.deliveryTime', { from: Math.min(...days), to: Math.max(...days) }),
		},
		config.returnWindowDays && {
			icon: RotateCcw,
			text: t('product.returns', { days: config.returnWindowDays }),
		},
	].filter(Boolean)

	return (
		<ul role='list' className={style.list} aria-label={t('product.deliveryInfo')}>
			{items.map(({ icon: Icon, text }) => (
				<li key={text} className={style.item}>
					<Icon size={18} strokeWidth={1.5} aria-hidden />
					{text}
				</li>
			))}
		</ul>
	)
}

export default DeliveryInfo
