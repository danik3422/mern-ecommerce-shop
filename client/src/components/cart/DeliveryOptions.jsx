import { useShopConfig } from '../../hooks/useShopConfig'
import style from './DeliveryOptions.module.css'
import { deliveryName } from '../../i18n/catalogText'
import { useI18n } from '../../i18n/useI18n'

/**
 * Delivery method radio group with the price each method would cost for this bag:
 * the server quote for the selected method, and for the others their price or "Free"
 * when the bag (after discounts) reaches the free-shipping threshold.
 * @param discountedSubtotal subtotal minus discount from the current quote
 */
const DeliveryOptions = ({ value, onChange, quotedShipping, discountedSubtotal }) => {
	const config = useShopConfig()
	const { t, locale, formatMoney } = useI18n()
	if (!config) return null

	const priceOf = (method) => {
		if (method.id === value && quotedShipping !== undefined) return quotedShipping
		const free =
			method.freeShipping &&
			config.freeShippingFrom != null &&
			discountedSubtotal !== undefined &&
			discountedSubtotal >= config.freeShippingFrom
		return free ? 0 : method.price
	}

	return (
		<fieldset className={style.fieldset}>
			<legend className={style.legend}>{t('delivery.legend')}</legend>
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
							<span className={style.label}>{deliveryName(t, locale, method)}</span>
							<span className={style.days}>
								{t('delivery.days', { from: method.days[0], to: method.days[1] })}
							</span>
						</span>
						<span className={style.price}>
							{price === 0 ? t('shipping.free') : formatMoney(price)}
						</span>
					</label>
				)
			})}
		</fieldset>
	)
}

export default DeliveryOptions
