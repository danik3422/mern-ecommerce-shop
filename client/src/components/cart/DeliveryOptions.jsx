import { useShopConfig } from '../../hooks/useShopConfig'
import { formatMoney } from '../../utils/money'
import style from './DeliveryOptions.module.css'

/**
 * Delivery method radio group with the price each method would cost for this bag:
 * the server quote for the selected method, and for the others their price or "Free"
 * when the bag (after discounts) reaches the free-shipping threshold.
 * @param discountedSubtotal subtotal minus discount from the current quote
 */
const DeliveryOptions = ({ value, onChange, quotedShipping, discountedSubtotal }) => {
	const config = useShopConfig()
	if (!config) return null

	const priceOf = (method) => {
		if (method.id === value && quotedShipping !== undefined) return quotedShipping
		const free =
			method.freeShipping &&
			discountedSubtotal !== undefined &&
			discountedSubtotal >= config.freeShippingFrom
		return free ? 0 : method.price
	}

	return (
		<fieldset className={style.fieldset}>
			<legend className={style.legend}>Delivery</legend>
			{config.shippingMethods.map((method) => {
				const price = priceOf(method)
				return (
					<label key={method.id} className={style.option}>
						<input
							type='radio'
							name='shippingMethod'
							value={method.id}
							checked={method.id === value}
							onChange={() => onChange(method.id)}
						/>
						<span className={style.text}>
							<span className={style.label}>{method.label}</span>
							<span className={style.days}>
								{method.days[0]}–{method.days[1]} business days
							</span>
						</span>
						<span className={style.price}>{price === 0 ? 'Free' : formatMoney(price)}</span>
					</label>
				)
			})}
		</fieldset>
	)
}

export default DeliveryOptions
