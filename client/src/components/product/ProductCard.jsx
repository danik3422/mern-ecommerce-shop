import { Link } from 'react-router'
import { formatMoney } from '../../utils/money'
import style from './ProductCard.module.css'

const ProductCard = ({ product }) => (
	<Link to={`/product/${product._id}`} className={style.card}>
		<div className={style.media}>
			<img className={style.image} src={product.img} alt='' loading='lazy' />
			{!product.inStock && <span className={style.tag}>Sold out</span>}
		</div>
		<div className={style.info}>
			<h3 className={style.title}>{product.title}</h3>
			<p className={style.price}>{formatMoney(product.price)}</p>
		</div>
	</Link>
)

export const ProductCardSkeleton = () => (
	<div className={style.card} aria-hidden>
		<div className={`${style.media} ${style.pulse}`} />
		<div className={style.info}>
			<div className={`${style.line} ${style.pulse}`} />
			<div className={`${style.line} ${style.short} ${style.pulse}`} />
		</div>
	</div>
)

export default ProductCard
