import { Add, Remove } from '@mui/icons-material'
import { useState } from 'react'
import { Link } from 'react-router'
import styled from 'styled-components'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { useCart } from '../../cart/useCart'
import { formatMoney } from '../../utils/money'

const ColorOption = styled.button`
	margin: 0px 5px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	border: 2px solid ${(props) => (props.$selected ? '#000' : '#ddd')};
	background-color: ${(props) => props.color};
	cursor: pointer;
`

const ProductDetails = ({ product }) => {
	const { addItem } = useCart()
	const [color, setColor] = useState(product.color[0])
	const [size, setSize] = useState(product.size[0])
	const [quantity, setQuantity] = useState(1)
	const [added, setAdded] = useState(false)

	const handleAdd = () => {
		addItem({ productId: product._id, color, size, quantity })
		setAdded(true)
	}

	return (
		<div className='product__wrapper'>
			<div className='product__img-container'>
				<img className='product__img' src={product.img} alt={product.title} />
			</div>

			<div className='product__info'>
				<h1 className='product__title'>{product.title}</h1>
				<p className='product__description'>{product.description}</p>
				<span className='product__price'>{formatMoney(product.price)}</span>

				<div className='product__filter-wrapper'>
					{product.color.length > 0 && (
						<div className='product__filter-color' role='radiogroup' aria-label='Color'>
							<span className='product__filter-title'>Color</span>
							{product.color.map((option) => (
								<ColorOption
									type='button'
									key={option}
									color={option}
									$selected={option === color}
									onClick={() => setColor(option)}
									role='radio'
									aria-checked={option === color}
									aria-label={option}
								/>
							))}
						</div>
					)}

					{product.size.length > 0 && (
						<label className='product__filter-size'>
							<span className='product__filter-title'>Size</span>
							<select
								className='product__filter-size'
								value={size}
								onChange={(e) => setSize(e.target.value)}
							>
								{product.size.map((option) => (
									<option key={option}>{option}</option>
								))}
							</select>
						</label>
					)}
				</div>

				<div className='product__add-wrapper'>
					<div className='product__amount'>
						<button
							type='button'
							className='product__icon-btn'
							onClick={() => setQuantity((q) => Math.max(1, q - 1))}
							aria-label='Decrease quantity'
						>
							<Remove />
						</button>
						<span className='product__add-price' aria-live='polite'>
							{quantity}
						</span>
						<button
							type='button'
							className='product__icon-btn'
							onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
							aria-label='Increase quantity'
						>
							<Add />
						</button>
					</div>
					<button className='product__add-btn' onClick={handleAdd} disabled={!product.inStock}>
						{product.inStock ? 'Add to cart' : 'Out of stock'}
					</button>
					{added && (
						<span role='status'>
							Added! <Link to='/cart'>Go to cart</Link>
						</span>
					)}
				</div>
			</div>
		</div>
	)
}

export default ProductDetails
