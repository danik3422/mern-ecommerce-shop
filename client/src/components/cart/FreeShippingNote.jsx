import { Truck } from 'lucide-react'
import { useShopConfig } from '../../hooks/useShopConfig'
import { formatMoney } from '../../utils/money'

/** "Free shipping on orders over $50.00" — renders nothing until the config is loaded. */
const FreeShippingNote = ({ className, icon = true }) => {
	const config = useShopConfig()
	if (!config) return null
	return (
		<span className={className}>
			{icon && <Truck size={16} aria-hidden />} Free shipping on orders over{' '}
			{formatMoney(config.freeShippingFrom)}
		</span>
	)
}

export default FreeShippingNote
