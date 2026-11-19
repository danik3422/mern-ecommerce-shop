import { Add, Remove } from '@mui/icons-material'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { api, getErrorMessage } from '../api'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import CheckoutBtn from '../components/UI/CheckoutBtn/CheckoutBtn'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const SHIPPING = 4.9
const FREE_SHIPPING_FROM = 50
const money = (n) => `$ ${n.toFixed(2)}`

const TopText = styled.span`
	text-decoration: underline;
	cursor: pointer;
	margin: 0px 10px;
`

const Product = styled.div`
	display: flex;
	justify-content: space-between;
`
const ProductDetails = styled.div`
	flex: 2;
	display: flex;
`
const Image = styled.img`
	width: 200px;
`
const Details = styled.div`
	padding: 20px;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
`
const ProductName = styled.span``
const ProductId = styled.span``
const ProductColor = styled.div`
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background-color: ${(props) => props.color};
`
const ProductSize = styled.span``
const PriceDetail = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
`
const IconButton = styled.button`
	display: inline-flex;
	background: none;
	cursor: pointer;
`
const ProductAmountContainer = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 20px;
`
const ProductAmount = styled.div`
	font-size: 24px;
	margin: 5px;
`
const ProductPrice = styled.div`
	font-size: 30px;
	font-weight: 200;
`

const Hr = styled.hr`
	background-color: #eee;
	border: none;
	height: 1px;
`

const Summary = styled.div`
	flex: 1;
	border: 0.5px solid lightgrey;
	padding: 20px;
`

const SummaryTitle = styled.h1`
	font-weight: 200;
`
const SummaryItem = styled.div`
	margin: 30px 0px;
	display: flex;
	justify-content: space-between;
	font-weight: ${(props) => props.type === 'total' && '500'};
	font-size: ${(props) => props.type === 'total' && '24px'};
`
const SummaryItemText = styled.span``
const SummaryItemPrice = styled.span``
const SummaryButton = styled.button`
	width: 100%;
	padding: 10px;
	background-color: black;
	color: white;
	font-weight: 600;
	cursor: pointer;

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
`
const AddressInput = styled.input`
	width: 100%;
	padding: 10px;
	margin-bottom: 15px;
	border: 1px solid lightgrey;
`
const Message = styled.p`
	margin-top: 15px;
	color: ${(props) => (props.$error ? 'crimson' : 'green')};
`

const Cart = () => {
	const { items, count, total, setQuantity, clear } = useCart()
	const { user } = useAuth()
	const navigate = useNavigate()
	const [address, setAddress] = useState('')
	const [status, setStatus] = useState({ type: 'idle', message: '' })

	const shipping = items.length ? SHIPPING : 0
	const discount = total >= FREE_SHIPPING_FROM ? -shipping : 0
	const grandTotal = total + shipping + discount

	const checkout = async () => {
		if (!user) return navigate('/login', { state: { from: '/cart' } })
		if (!address.trim()) {
			return setStatus({ type: 'error', message: 'Please enter a shipping address' })
		}
		setStatus({ type: 'loading', message: '' })
		try {
			const { data } = await api.post('/orders', {
				products: items.map(({ _id, quantity, color, size }) => ({
					productId: _id,
					quantity,
					color,
					size,
				})),
				address: { line: address.trim() },
			})
			clear()
			setAddress('')
			setStatus({
				type: 'success',
				message: `Order placed! Total ${money(data.amount)}. Order id: ${data._id}`,
			})
		} catch (err) {
			setStatus({ type: 'error', message: getErrorMessage(err) })
		}
	}

	return (
		<>
			<Navbar />
			<div className='cart__container'>
				<div className='cart__wrapper'>
					<h1 className='cart__title'>Your bag</h1>
					<div className='cart__header'>
						<CheckoutBtn onClick={() => navigate('/products')}>
							Continue Shopping
						</CheckoutBtn>
						<div>
							<TopText>Shopping bag({count})</TopText>
							<TopText>Your wishlist(0)</TopText>
						</div>
						<CheckoutBtn
							type='filled'
							onClick={checkout}
							disabled={!items.length || status.type === 'loading'}
						>
							Checkout now
						</CheckoutBtn>
					</div>
					<div className='cart__footer'>
						<div className='cart__info'>
							{!items.length && <p>Your bag is empty.</p>}
							{items.map((item, index) => (
								<div key={item.key}>
									{index > 0 && <Hr />}
									<Product>
										<ProductDetails>
											<Link to={`/product/${item._id}`}>
												<Image src={item.img} alt={item.title} />
											</Link>
											<Details>
												<ProductName>
													<b>Product:</b> {item.title}
												</ProductName>
												<ProductId>
													<b>ID:</b> {item._id}
												</ProductId>
												{item.color && <ProductColor color={item.color} />}
												{item.size && (
													<ProductSize>
														<b>Size:</b> {item.size}
													</ProductSize>
												)}
											</Details>
										</ProductDetails>
										<PriceDetail>
											<ProductAmountContainer>
												<IconButton
													type='button'
													onClick={() => setQuantity(item.key, item.quantity + 1)}
													aria-label='Increase quantity'
												>
													<Add />
												</IconButton>
												<ProductAmount>{item.quantity}</ProductAmount>
												<IconButton
													type='button'
													onClick={() => setQuantity(item.key, item.quantity - 1)}
													aria-label='Decrease quantity'
												>
													<Remove />
												</IconButton>
											</ProductAmountContainer>
											<ProductPrice>{money(item.price * item.quantity)}</ProductPrice>
										</PriceDetail>
									</Product>
								</div>
							))}
						</div>
						<Summary>
							<SummaryTitle>Order Summary</SummaryTitle>
							<SummaryItem>
								<SummaryItemText>Subtotal</SummaryItemText>
								<SummaryItemPrice>{money(total)}</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem>
								<SummaryItemText>Estimated Shipping</SummaryItemText>
								<SummaryItemPrice>{money(shipping)}</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem>
								<SummaryItemText>
									Shipping Discount (from {money(FREE_SHIPPING_FROM)})
								</SummaryItemText>
								<SummaryItemPrice>{money(discount)}</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem type='total'>
								<SummaryItemText>Total</SummaryItemText>
								<SummaryItemPrice>{money(grandTotal)}</SummaryItemPrice>
							</SummaryItem>
							{user && items.length > 0 && (
								<AddressInput
									placeholder='Shipping address'
									value={address}
									onChange={(e) => setAddress(e.target.value)}
								/>
							)}
							<SummaryButton
								onClick={checkout}
								disabled={!items.length || status.type === 'loading'}
							>
								{user ? 'Checkout now' : 'Sign in to checkout'}
							</SummaryButton>
							{status.message && (
								<Message $error={status.type === 'error'}>{status.message}</Message>
							)}
						</Summary>
					</div>
				</div>
			</div>
			<Footer />
		</>
	)
}

export default Cart
