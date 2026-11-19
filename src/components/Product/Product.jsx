import {
	FavoriteBorder,
	SearchOutlined,
	ShoppingBagOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import style from './Product.module.css'

const Product = ({ item }) => {
	const { addItem } = useCart()

	const quickAdd = () =>
		addItem(item, { color: item.color?.[0], size: item.size?.[0], quantity: 1 })

	return (
		<div className={style.container}>
			<div className={style.circle} />
			<img className={style['product__img']} src={item.img} alt={item.title} />
			<div className={style['product__info']}>
				<button
					type='button'
					className={style['product__info-icon']}
					onClick={quickAdd}
					aria-label={`Add ${item.title} to cart`}
				>
					<ShoppingBagOutlined />
				</button>
				<Link
					to={`/product/${item._id}`}
					className={style['product__info-icon']}
					aria-label={`View ${item.title}`}
				>
					<SearchOutlined />
				</Link>
				<button
					type='button'
					className={style['product__info-icon']}
					aria-label='Add to wishlist'
				>
					<FavoriteBorder />
				</button>
			</div>
			<div className={style['product__caption']}>
				<span>{item.title}</span>
				<b>$ {item.price}</b>
			</div>
		</div>
	)
}

export default Product
