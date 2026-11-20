import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getErrorMessage, getFieldErrors } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { redirectToPayment } from '../cart/redirect'
import { useCart } from '../cart/useCart'
import { useCartItems } from '../cart/useCartItems'
import { useCheckoutQuote } from '../cart/useCheckoutQuote'
import CartLine from '../components/cart/CartLine'
import CheckoutForm from '../components/cart/CheckoutForm'
import DeliveryOptions from '../components/cart/DeliveryOptions'
import FreeShippingProgress from '../components/cart/FreeShippingProgress'
import OrderSummary from '../components/cart/OrderSummary'
import PromoCodeField from '../components/cart/PromoCodeField'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import style from './Cart.module.css'
import { stockOf } from '../utils/variants'

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
	const navigate = useNavigate()
	const [isRedirecting, setIsRedirecting] = useState(false)
	const [shippingMethod, setShippingMethod] = useState('standard')
	const [promoCode, setPromoCode] = useState(null)
	const [promoNotice, setPromoNotice] = useState(null)
	const quote = useCheckoutQuote({ lines, shippingMethod, promoCode })

	// an applied code can stop working (e.g. the bag drops below its minimum): remove it and say why
	const promoError = quote.isError && getFieldErrors(quote.error).promoCode
	if (promoCode && promoError) {
		setPromoCode(null)
		setPromoNotice(promoError)
	}

	const applyPromoCode = (code) => {
		setPromoNotice(null)
		setPromoCode(code)
	}

	// the server has reserved the stock and emptied the saved cart, so the local one goes too
	const handleOrderPlaced = ({ order, checkoutUrl }) => {
		clear()
		if (checkoutUrl) {
			setIsRedirecting(true)
			redirectToPayment(checkoutUrl)
		} else {
			navigate(`/checkout/success?order=${order._id}`)
		}
	}

	if (isRedirecting) {
		return <EmptyState title='Taking you to the payment page…' />
	}

	if (!lines.length) {
		return (
			<EmptyState title='Your bag is empty' action={<ContinueShopping />}>
				Looks like you have not added anything yet.
			</EmptyState>
		)
	}

	const hasStockProblems = items.some((item) => stockOf(item.variant, item.size) < item.quantity)

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
					<OrderSummary
						quote={quote.data}
						isUpdating={quote.isFetching}
						controls={
							<>
								<DeliveryOptions
									value={shippingMethod}
									onChange={setShippingMethod}
									quotedShipping={quote.data?.shipping}
									discountedSubtotal={quote.data && quote.data.subtotal - quote.data.discount}
								/>
								<PromoCodeField
									lines={lines}
									shippingMethod={shippingMethod}
									appliedCode={promoCode}
									onApply={applyPromoCode}
									notice={promoNotice}
								/>
								{quote.data && shippingMethod !== 'express' && (
									<FreeShippingProgress subtotal={quote.data.subtotal - quote.data.discount} />
								)}
							</>
						}
					>
						{quote.isError && !promoError && (
							<Alert tone='error'>{getErrorMessage(quote.error)}</Alert>
						)}
						{user ? (
							<CheckoutForm
								lines={lines}
								shippingMethod={shippingMethod}
								promoCode={promoCode}
								disabled={hasStockProblems || !quote.data}
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
