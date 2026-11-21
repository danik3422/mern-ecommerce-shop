import { Truck } from 'lucide-react'
import { useShopConfig } from '../../hooks/useShopConfig'
import { useI18n } from '../../i18n/useI18n'
import style from './FreeShippingProgress.module.css'

/**
 * "Add $12.00 more for free shipping" with a progress bar (threshold from the shop config);
 * nothing when the shop has no free shipping.
 */
const FreeShippingProgress = ({ subtotal }) => {
	const config = useShopConfig()
	const { t, formatMoney } = useI18n()
	if (!config?.freeShippingFrom) return null

	const threshold = config.freeShippingFrom
	const missing = threshold - subtotal
	const percent = Math.min(100, Math.round((subtotal / threshold) * 100))

	return (
		<div className={style.progress}>
			<p className={style.text}>
				<Truck size={16} aria-hidden />
				<span>
					{missing > 0
						? t('shipping.addMore', { amount: formatMoney(missing) })
						: t('shipping.youGetFree')}
				</span>
			</p>
			<div
				className={style.track}
				role='progressbar'
				aria-label={t('shipping.progress')}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
			>
				<div className={style.bar} style={{ width: `${percent}%` }} />
			</div>
		</div>
	)
}

export default FreeShippingProgress
