import style from './OrderSummary.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Totals calculated by the server (POST /checkout/quote).
 * @param quote `{ subtotal, discount, shipping, amount, promo? }` or undefined while loading
 * @param controls delivery and promo code inputs shown above the totals
 * @param children the checkout form or sign-in prompt below the totals
 */
const OrderSummary = ({ quote, isUpdating, controls, children }) => {
	const { t, formatMoney } = useI18n()
	return (
		<aside className={style.summary} aria-labelledby='order-summary-title'>
			<h2 id='order-summary-title' className={style.title}>
				{t('summary.title')}
			</h2>
			{controls}
			{quote ? (
				<dl className={style.rows} aria-busy={isUpdating}>
					<div className={style.row}>
						<dt>{t('summary.subtotal')}</dt>
						<dd>{formatMoney(quote.subtotal)}</dd>
					</div>
					{quote.discount > 0 && (
						<div className={`${style.row} ${style.discount}`}>
							<dt>
								{quote.promo
									? t('summary.discountWithCode', { code: quote.promo.code })
									: t('summary.discount')}
							</dt>
							<dd>−{formatMoney(quote.discount)}</dd>
						</div>
					)}
					<div className={style.row}>
						<dt>{t(`delivery.${quote.shippingMethod?.id ?? 'shipping'}`)}</dt>
						<dd>{quote.shipping ? formatMoney(quote.shipping) : t('shipping.free')}</dd>
					</div>
					<div className={`${style.row} ${style.total}`}>
						<dt>{t('summary.total')}</dt>
						<dd>{formatMoney(quote.amount)}</dd>
					</div>
				</dl>
			) : (
				<p className={style.muted}>{t('summary.calculating')}</p>
			)}
			{children}
		</aside>
	)
}

export default OrderSummary
