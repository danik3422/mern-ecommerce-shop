import { useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { calculateTotals } from '../cart/pricing'
import { useCart } from '../cart/useCart'
import { useCartItems } from '../cart/useCartItems'
import CartLine from '../components/Cart/CartLine'
import CheckoutForm from '../components/Cart/CheckoutForm'
import OrderSummary from '../components/Cart/OrderSummary'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import CheckoutBtn from '../components/UI/CheckoutBtn/CheckoutBtn'
import { formatMoney } from '../utils/money'

const Divider = styled.hr`
	background-color: #eee;
	border: none;
	height: 1px;
`
const Success = styled.p`
	color: green;
	text-align: center;
	padding: 20px;
`

const toPricedItems = (items) =>
	items.map((item) => ({ price: item.product.price, quantity: item.quantity }))

const Cart = () => {
	const { user } = useAuth()
	const { lines, count, setQuantity, clear } = useCart()
	const { items, isLoading, error } = useCartItems()
	const navigate = useNavigate()
	const [placedOrder, setPlacedOrder] = useState(null)

	const totals = calculateTotals(toPricedItems(items))
	const hasOutOfStock = items.some((item) => !item.product.inStock)

	const handleOrderPlaced = (order) => {
		clear()
		setPlacedOrder(order)
	}

	return (
		<>
			<Navbar />
			<main className='cart__container'>
				<div className='cart__wrapper'>
					<h1 className='cart__title'>Your bag</h1>
					<div className='cart__header'>
						<CheckoutBtn onClick={() => navigate('/products')}>Continue Shopping</CheckoutBtn>
						<span>Shopping bag ({count})</span>
					</div>

					{placedOrder && (
						<Success role='status'>
							Thank you! Order #{placedOrder._id} for {formatMoney(placedOrder.amount)} has been
							placed.
						</Success>
					)}

					<div className='cart__footer'>
						<div className='cart__info'>
							{isLoading && <p>Loading your bag…</p>}
							{error && <p>Could not load the products: {getErrorMessage(error)}</p>}
							{!lines.length && !placedOrder && <p>Your bag is empty.</p>}
							{items.map((item, index) => (
								<div key={item.key}>
									{index > 0 && <Divider />}
									<CartLine item={item} onQuantityChange={setQuantity} />
								</div>
							))}
						</div>

						{items.length > 0 && (
							<OrderSummary totals={totals}>
								{user ? (
									<CheckoutForm
										lines={lines}
										disabled={hasOutOfStock}
										onOrderPlaced={handleOrderPlaced}
									/>
								) : (
									<CheckoutBtn
										type='filled'
										onClick={() => navigate('/login', { state: { from: '/cart' } })}
									>
										Sign in to check out
									</CheckoutBtn>
								)}
							</OrderSummary>
						)}
					</div>
				</div>
			</main>
			<Footer />
		</>
	)
}

export default Cart
