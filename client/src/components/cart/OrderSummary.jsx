import { formatMoney } from '../../utils/money'
import FreeShippingProgress from './FreeShippingProgress'
import style from './OrderSummary.module.css'

/** @param totals `{ subtotal, shipping, total }` from calculateTotals */
const OrderSummary = ({ totals, children }) => {
	return (
		<aside className={style.summary} aria-labelledby='order-summary-title'>
			<h2 id='order-summary-title' className={style.title}>
				Order summary
			</h2>
			<dl className={style.rows}>
				<div className={style.row}>
					<dt>Subtotal</dt>
					<dd>{formatMoney(totals.subtotal)}</dd>
				</div>
				<div className={style.row}>
					<dt>Shipping</dt>
					<dd>{totals.shipping ? formatMoney(totals.shipping) : 'Free'}</dd>
				</div>
				<div className={`${style.row} ${style.total}`}>
					<dt>Total</dt>
					<dd>{formatMoney(totals.total)}</dd>
				</div>
			</dl>
			<FreeShippingProgress subtotal={totals.subtotal} />
			{children}
		</aside>
	)
}

export default OrderSummary
