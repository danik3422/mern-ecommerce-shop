import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { calculateTotals } from '../cart/pricing'
import { useCart } from '../cart/useCart'
import { useCartItems } from '../cart/useCartItems'
import CartLine from '../components/cart/CartLine'
import CheckoutForm from '../components/cart/CheckoutForm'
import OrderSummary from '../components/cart/OrderSummary'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatMoney } from '../utils/money'
import style from './Cart.module.css'

const toPricedItems = (items) =>
	items.map((item) => ({ price: item.product.price, quantity: item.quantity }))

const ContinueShopping = () => (
	<Button as={Link} to='/products' variant='secondary'>
		Continue shopping
	</Button>
)

const Cart = () => {
	useDocumentTitle('Bag')
	const { user } = useAuth()
	const { lines, count, setQuantity, clear } = useCart()
	const { items, isLoading, error } = useCartItems()
	const [placedOrder, setPlacedOrder] = useState(null)

	const handleOrderPlaced = (order) => {
		clear()
		setPlacedOrder(order)
	}

	if (placedOrder) {
		return (
			<EmptyState title='Thank you for your order' action={<ContinueShopping />}>
				<CheckCircle2 size={32} aria-hidden className={style.successIcon} />
				Order #{placedOrder._id.slice(-8).toUpperCase()} for {formatMoney(placedOrder.amount)} has
				been placed. We will let you know when it ships.
			</EmptyState>
		)
	}

	if (!lines.length) {
		return (
			<EmptyState title='Your bag is empty' action={<ContinueShopping />}>
				Looks like you have not added anything yet.
			</EmptyState>
		)
	}

	const totals = calculateTotals(toPricedItems(items))
	const hasStockProblems = items.some(
		(item) => (item.product.sizes.find((s) => s.label === item.size)?.stock ?? 0) < item.quantity,
	)

	return (
		<div className='container'>
			<div className={style.header}>
				<h1 className={style.title}>Bag</h1>
				<p className={style.count}>
					{count} {count === 1 ? 'item' : 'items'}
				</p>
			</div>

			<div className={style.layout}>
				<section aria-label='Items in your bag'>
					{isLoading && <p className={style.muted}>Loading your bag…</p>}
					{error && <Alert tone='error'>Could not load your bag: {getErrorMessage(error)}</Alert>}
					<ul role='list'>
						{items.map((item) => (
							<CartLine key={item.key} item={item} onQuantityChange={setQuantity} />
						))}
					</ul>
				</section>

				{items.length > 0 && (
					<OrderSummary totals={totals}>
						{user ? (
							<CheckoutForm
								lines={lines}
								disabled={hasStockProblems}
								onOrderPlaced={handleOrderPlaced}
							/>
						) : (
							<>
								<Button as={Link} to='/login' state={{ from: '/cart' }} fullWidth>
									Sign in to check out
								</Button>
								<p className={style.muted}>
									New here?{' '}
									<Link to='/register' state={{ from: '/cart' }} className='text-link'>
										Create an account
									</Link>
								</p>
							</>
						)}
					</OrderSummary>
				)}
			</div>
		</div>
	)
}

export default Cart
