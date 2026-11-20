import { formatMoney } from '../../utils/money'
import style from './OrderSummary.module.css'

/**
 * Totals calculated by the server (POST /checkout/quote).
 * @param quote `{ subtotal, discount, shipping, amount, promo? }` or undefined while loading
 * @param controls delivery and promo code inputs shown above the totals
 * @param children the checkout form or sign-in prompt below the totals
 */
const OrderSummary = ({ quote, isUpdating, controls, children }) => (
	<aside className={style.summary} aria-labelledby='order-summary-title'>
		<h2 id='order-summary-title' className={style.title}>
			Order summary
		</h2>
		{controls}
		{quote ? (
			<dl className={style.rows} aria-busy={isUpdating}>
				<div className={style.row}>
					<dt>Subtotal</dt>
					<dd>{formatMoney(quote.subtotal)}</dd>
				</div>
				{quote.discount > 0 && (
					<div className={`${style.row} ${style.discount}`}>
						<dt>Discount{quote.promo ? ` (${quote.promo.code})` : ''}</dt>
						<dd>−{formatMoney(quote.discount)}</dd>
					</div>
				)}
				<div className={style.row}>
					<dt>{quote.shippingMethod?.label ?? 'Shipping'}</dt>
					<dd>{quote.shipping ? formatMoney(quote.shipping) : 'Free'}</dd>
				</div>
				<div className={`${style.row} ${style.total}`}>
					<dt>Total</dt>
					<dd>{formatMoney(quote.amount)}</dd>
				</div>
			</dl>
		) : (
			<p className={style.muted}>Calculating…</p>
		)}
		{children}
	</aside>
)

export default OrderSummary
