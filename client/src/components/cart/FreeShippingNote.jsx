import { Truck } from 'lucide-react'
import { useShopConfig } from '../../hooks/useShopConfig'
import { useI18n } from '../../i18n/useI18n'

/**
 * "Free shipping on orders over 200,00 zł" — renders nothing until the config is loaded
 * or when the shop has no free shipping.
 */
const FreeShippingNote = ({ className, icon = true }) => {
	const config = useShopConfig()
	const { t, formatMoney } = useI18n()
	if (!config?.freeShippingFrom) return null
	return (
		<span className={className}>
			{icon && <Truck size={16} aria-hidden />}{' '}
			{t('shipping.freeFrom', { amount: formatMoney(config.freeShippingFrom) })}
		</span>
	)
}

export default FreeShippingNote
