import { Add, Remove } from '@mui/icons-material'
import { Link } from 'react-router'
import styled from 'styled-components'
import { formatMoney } from '../../utils/money'

const Row = styled.div`
	display: flex;
	justify-content: space-between;
`
const ProductInfo = styled.div`
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
const ColorDot = styled.div`
	width: 20px;
	height: 20px;
	border-radius: 50%;
	border: 1px solid #ddd;
	background-color: ${(props) => props.color};
`
const Warning = styled.span`
	color: crimson;
	font-weight: 600;
`
const PriceInfo = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
`
const QuantityControl = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 20px;
`
const IconButton = styled.button`
	display: inline-flex;
	background: none;
	cursor: pointer;
`
const Quantity = styled.div`
	font-size: 24px;
	margin: 5px;
`
const Price = styled.div`
	font-size: 30px;
	font-weight: 200;
`

/** @param item `{ key, quantity, color, size, product }` from useCartItems */
const CartLine = ({ item, onQuantityChange }) => {
	const { product } = item

	return (
		<Row>
			<ProductInfo>
				<Link to={`/product/${product._id}`}>
					<Image src={product.img} alt={product.title} loading='lazy' />
				</Link>
				<Details>
					<span>
						<b>Product:</b> {product.title}
					</span>
					{item.color && <ColorDot color={item.color} title={item.color} />}
					{item.size && (
						<span>
							<b>Size:</b> {item.size}
						</span>
					)}
					{!product.inStock && <Warning>Out of stock — remove it to check out</Warning>}
				</Details>
			</ProductInfo>
			<PriceInfo>
				<QuantityControl>
					<IconButton
						type='button'
						onClick={() => onQuantityChange(item.key, item.quantity - 1)}
						aria-label={`Decrease quantity of ${product.title}`}
					>
						<Remove />
					</IconButton>
					<Quantity aria-label='Quantity'>{item.quantity}</Quantity>
					<IconButton
						type='button'
						onClick={() => onQuantityChange(item.key, item.quantity + 1)}
						aria-label={`Increase quantity of ${product.title}`}
					>
						<Add />
					</IconButton>
				</QuantityControl>
				<Price>{formatMoney(product.price * item.quantity)}</Price>
			</PriceInfo>
		</Row>
	)
}

export default CartLine
