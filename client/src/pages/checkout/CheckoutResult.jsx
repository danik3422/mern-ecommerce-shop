import EmptyState from '../../components/ui/EmptyState'

/**
 * /checkout/success and /checkout/cancel — where Stripe Checkout returns.
 * Placeholder — implemented by the payments workstream.
 * @param result 'success' | 'cancel'
 */
const CheckoutResult = ({ result }) => (
	<EmptyState title={result === 'success' ? 'Thank you for your order' : 'Payment cancelled'} />
)

export default CheckoutResult
