import { Truck } from 'lucide-react'
import { useShopConfig } from '../../hooks/useShopConfig'
import { formatMoney } from '../../utils/money'
import style from './FreeShippingProgress.module.css'

/** "Add $12.00 more for free shipping" with a progress bar (threshold from the shop config). */
const FreeShippingProgress = ({ subtotal }) => {
	const config = useShopConfig()
	if (!config) return null

	const threshold = config.freeShippingFrom
	const missing = threshold - subtotal
	const percent = Math.min(100, Math.round((subtotal / threshold) * 100))

	return (
		<div className={style.progress}>
			<p className={style.text}>
				<Truck size={16} aria-hidden />
				{missing > 0 ? (
					<span>
						Add <strong>{formatMoney(missing)}</strong> more for free shipping
					</span>
				) : (
					<span>You get free shipping</span>
				)}
			</p>
			<div
				className={style.track}
				role='progressbar'
				aria-label='Progress to free shipping'
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
