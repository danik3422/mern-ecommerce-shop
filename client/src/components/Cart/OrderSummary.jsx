import styled from 'styled-components'
import { FREE_SHIPPING_FROM } from '../../cart/pricing'
import { formatMoney } from '../../utils/money'

const Summary = styled.section`
	flex: 1;
	border: 0.5px solid lightgrey;
	padding: 20px;
`
const Title = styled.h2`
	font-weight: 200;
`
const Row = styled.div`
	margin: 30px 0px;
	display: flex;
	justify-content: space-between;
	font-weight: ${(props) => (props.$total ? 500 : 'normal')};
	font-size: ${(props) => (props.$total ? '24px' : 'inherit')};
`

/** @param totals `{ subtotal, shipping, total }` from calculateTotals */
const OrderSummary = ({ totals, children }) => (
	<Summary aria-label='Order summary'>
		<Title>Order Summary</Title>
		<Row>
			<span>Subtotal</span>
			<span>{formatMoney(totals.subtotal)}</span>
		</Row>
		<Row>
			<span>Shipping (free from {formatMoney(FREE_SHIPPING_FROM)})</span>
			<span>{totals.shipping ? formatMoney(totals.shipping) : 'Free'}</span>
		</Row>
		<Row $total>
			<span>Total</span>
			<span>{formatMoney(totals.total)}</span>
		</Row>
		{children}
	</Summary>
)

export default OrderSummary
