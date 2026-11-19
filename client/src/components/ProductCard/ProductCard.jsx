import { SearchOutlined, ShoppingBagOutlined } from '@mui/icons-material'
import { Link } from 'react-router'
import { useCart } from '../../cart/useCart'
import { formatMoney } from '../../utils/money'
import style from './ProductCard.module.css'

const ProductCard = ({ product }) => {
	const { addItem } = useCart()
	const productUrl = `/product/${product._id}`
	// adding from the grid only makes sense when there is nothing to choose
	const canQuickAdd = product.inStock && product.color.length <= 1 && product.size.length <= 1

	const quickAdd = () =>
		addItem({
			productId: product._id,
			color: product.color[0],
			size: product.size[0],
			quantity: 1,
		})

	return (
		<div className={style.container}>
			<div className={style.circle} />
			<img className={style.image} src={product.img} alt={product.title} loading='lazy' />
			<div className={style.actions}>
				{canQuickAdd ? (
					<button
						type='button'
						className={style.action}
						onClick={quickAdd}
						aria-label={`Add ${product.title} to cart`}
					>
						<ShoppingBagOutlined />
					</button>
				) : (
					<Link
						to={productUrl}
						className={style.action}
						aria-label={`Choose options for ${product.title}`}
					>
						<ShoppingBagOutlined />
					</Link>
				)}
				<Link to={productUrl} className={style.action} aria-label={`View ${product.title}`}>
					<SearchOutlined />
				</Link>
			</div>
			<div className={style.caption}>
				<span>{product.title}</span>
				<b>{product.inStock ? formatMoney(product.price) : 'Out of stock'}</b>
			</div>
		</div>
	)
}

export default ProductCard
