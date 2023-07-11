import { Add, Remove } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import CheckoutBtn from '../components/UI/CheckoutBtn/CheckoutBtn'
const TopText = styled.span`
	text-decoration: underline;
	cursor: pointer;
	margin: 0px 10px;
`

const Info = styled.div`
	flex: 3;
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
`

const Cart = () => {
	return (
		<>
			<Navbar />
			<div className='cart__container'>
				<div className='cart__wrapper'>
					<h1 className='cart__title'>Your bag</h1>
					<div className='cart__header'>
						<Link to='/'>
							<CheckoutBtn>Continue Shopping</CheckoutBtn>
						</Link>

						<div>
							<TopText>Shopping bag(4)</TopText>
							<TopText>Your wishlist(0)</TopText>
						</div>

						<CheckoutBtn type='filled'>Checkout now</CheckoutBtn>
					</div>
					<div className='cart__footer'>
						<div className='cart__info'>
							<Product>
								<ProductDetails>
									<Image src='https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1614188818-TD1MTHU_SHOE_ANGLE_GLOBAL_MENS_TREE_DASHERS_THUNDER_b01b1013-cd8d-48e7-bed9-52db26515dc4.png?crop=1xw:1.00xh;center,top&resize=480%3A%2A' />
									<Details>
										<ProductName>
											<b>Product:</b> JESSIE THUNDER SHOES
										</ProductName>
										<ProductId>
											<b>ID:</b> 93813718293
										</ProductId>
										<ProductColor color='black' />
										<ProductSize>
											<b>Size:</b> 37.5
										</ProductSize>
									</Details>
								</ProductDetails>
								<PriceDetail>
									<ProductAmountContainer>
										<Add />
										<ProductAmount>2</ProductAmount>
										<Remove />
									</ProductAmountContainer>
									<ProductPrice>$ 40</ProductPrice>
								</PriceDetail>
							</Product>
							<Hr />
							<Product>
								<ProductDetails>
									<Image src='https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1614188818-TD1MTHU_SHOE_ANGLE_GLOBAL_MENS_TREE_DASHERS_THUNDER_b01b1013-cd8d-48e7-bed9-52db26515dc4.png?crop=1xw:1.00xh;center,top&resize=480%3A%2A' />
									<Details>
										<ProductName>
											<b>Product:</b> JESSIE THUNDER SHOES
										</ProductName>
										<ProductId>
											<b>ID:</b> 93813718293
										</ProductId>
										<ProductColor color='black' />
										<ProductSize>
											<b>Size:</b> 37.5
										</ProductSize>
									</Details>
								</ProductDetails>
								<PriceDetail>
									<ProductAmountContainer>
										<Add />
										<ProductAmount>2</ProductAmount>
										<Remove />
									</ProductAmountContainer>
									<ProductPrice>$ 40</ProductPrice>
								</PriceDetail>
							</Product>
						</div>
						<Summary>
							<SummaryTitle>Order Summary</SummaryTitle>
							<SummaryItem>
								<SummaryItemText>Subtotal</SummaryItemText>
								<SummaryItemPrice>$ 90</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem>
								<SummaryItemText>Estimated Shipping</SummaryItemText>
								<SummaryItemPrice>$ 4.90</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem>
								<SummaryItemText>Shipping Discount</SummaryItemText>
								<SummaryItemPrice>$ -5.90</SummaryItemPrice>
							</SummaryItem>
							<SummaryItem type='total'>
								<SummaryItemText>Total</SummaryItemText>
								<SummaryItemPrice>$ 90</SummaryItemPrice>
							</SummaryItem>
							<SummaryButton>Chekout Now</SummaryButton>
						</Summary>
					</div>
				</div>
			</div>
			<Footer />
		</>
	)
}

export default Cart
