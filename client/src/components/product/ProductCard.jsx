import { Link } from 'react-router'
import WishlistButton from '../account/WishlistButton'
import RatingStars from '../reviews/RatingStars'
import Price from './Price'
import style from './ProductCard.module.css'

const ProductCard = ({ product }) => (
	<div className={style.card}>
		<Link to={`/product/${product.slug}`} className={style.link}>
			<div className={style.media}>
				<img className={style.image} src={product.images[0]} alt='' loading='lazy' />
				{/* a second photo is revealed on hover */}
				{product.images[1] && (
					<img className={style.hoverImage} src={product.images[1]} alt='' loading='lazy' />
				)}
				{!product.inStock && <span className={style.tag}>Sold out</span>}
				{product.inStock && product.onSale && (
					<span className={`${style.tag} ${style.saleTag}`}>Sale</span>
				)}
			</div>
			<div className={style.info}>
				<p className={style.brand}>{product.brand}</p>
				<h3 className={style.title}>{product.title}</h3>
				<Price product={product} />
				<RatingStars value={product.rating?.average ?? 0} count={product.rating?.count} size={12} />
			</div>
		</Link>
		<div className={style.wishlist}>
			<WishlistButton productId={product._id} />
		</div>
	</div>
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
