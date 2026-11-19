import { Add, Remove } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { api, getErrorMessage } from '../api'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import { useCart } from '../context/CartContext'

const FilterColor = styled.button`
	margin: 0px 5px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	border: 2px solid ${(props) => (props.$active ? '#000' : '#ddd')};
	background-color: ${(props) => props.color};
	cursor: pointer;
`

const Product = () => {
	const { id } = useParams()
	const { addItem } = useCart()
	const [product, setProduct] = useState(null)
	const [error, setError] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [color, setColor] = useState('')
	const [size, setSize] = useState('')
	const [added, setAdded] = useState(false)

	useEffect(() => {
		setProduct(null)
		setError('')
		api
			.get(`/products/find/${id}`)
			.then(({ data }) => {
				setProduct(data)
				setColor(data.color?.[0] || '')
				setSize(data.size?.[0] || '')
			})
			.catch((err) => setError(getErrorMessage(err)))
	}, [id])

	const handleAdd = () => {
		addItem(product, { color, size, quantity })
		setAdded(true)
	}

	return (
		<>
			<Navbar />
			{error && <div className='status-page'>Could not load product: {error}</div>}
			{!error && !product && <div className='status-page'>Loading…</div>}
			{product && (
				<div className='product__wrapper'>
					<div className='product__img-container'>
						<img className='product__img' src={product.img} alt={product.title} />
					</div>

					<div className='product__info'>
						<h1 className='product__title'>{product.title}</h1>
						<p className='product__description'>{product.description}</p>
						<span className='product__price'>$ {product.price}</span>
						<div className='product__filter-wrapper'>
							{product.color?.length > 0 && (
								<div className='product__filter-color'>
									<span className='product__filter-title'>Color</span>
									{product.color.map((c) => (
										<FilterColor
											type='button'
											key={c}
											color={c}
											$active={c === color}
											onClick={() => setColor(c)}
											aria-label={c}
										/>
									))}
								</div>
							)}

							{product.size?.length > 0 && (
								<div className='product__filter-size'>
									<span className='product__filter-title'>Size</span>
									<select
										className='product__filter-size'
										value={size}
										onChange={(e) => setSize(e.target.value)}
									>
										{product.size.map((s) => (
											<option key={s}>{s}</option>
										))}
									</select>
								</div>
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
								<span className='product__add-price'>{quantity}</span>
								<button
									type='button'
									className='product__icon-btn'
									onClick={() => setQuantity((q) => q + 1)}
									aria-label='Increase quantity'
								>
									<Add />
								</button>
							</div>
							<button
								className='product__add-btn'
								onClick={handleAdd}
								disabled={!product.inStock}
							>
								{product.inStock ? 'Add to cart' : 'Out of stock'}
							</button>
							{added && <span>Added to cart ✓</span>}
						</div>
					</div>
				</div>
			)}
			<Footer />
		</>
	)
}

export default Product
