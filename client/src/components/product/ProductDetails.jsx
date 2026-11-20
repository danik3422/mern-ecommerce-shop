import { Truck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { FREE_SHIPPING_FROM } from '../../cart/pricing'
import { useCart } from '../../cart/useCart'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import { CATEGORY_TITLES } from '../../data/catalog'
import { rememberViewedProduct } from '../../hooks/useRecentlyViewed'
import WishlistButton from '../account/WishlistButton'
import MiniBag from '../cart/MiniBag'
import ProductReviews from '../reviews/ProductReviews'
import RatingStars from '../reviews/RatingStars'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import OptionPicker from './OptionPicker'
import Price from './Price'
import style from './ProductDetails.module.css'
import ProductGallery from './ProductGallery'
import SizeGuide from './SizeGuide'
import SizePicker from './SizePicker'

const firstAvailableSize = (sizes) => (sizes.find((s) => s.stock > 0) ?? sizes[0]).label

const ProductDetails = ({ product }) => {
	const { addItem } = useCart()
	const [color, setColor] = useState(product.colors[0])
	const [size, setSize] = useState(() => firstAvailableSize(product.sizes))
	const [quantity, setQuantity] = useState(1)
	// the line just added; opens the mini bag
	const [addedLine, setAddedLine] = useState(null)
	const [showStickyBar, setShowStickyBar] = useState(false)
	const purchaseRef = useRef(null)

	const category = product.categories[0]
	const sizeStock = product.sizes.find((s) => s.label === size)?.stock ?? 0
	const isOneSize = product.sizes.length === 1

	useEffect(() => {
		rememberViewedProduct(product._id)
	}, [product._id])

	// On small screens a bar with "Add to bag" appears once the main button has scrolled
	// above the viewport. A scroll listener is used instead of IntersectionObserver, which
	// misses jumps past the button (fast flings, the "#reviews" link).
	useEffect(() => {
		const target = purchaseRef.current
		if (!target) return
		let frame = 0
		const update = () => {
			frame = 0
			setShowStickyBar(target.getBoundingClientRect().bottom < 0)
		}
		const handleScroll = () => {
			frame ||= requestAnimationFrame(update)
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', handleScroll)
			cancelAnimationFrame(frame)
		}
	}, [])

	const handleAdd = () => {
		const line = { productId: product._id, color, size, quantity }
		addItem(line)
		setAddedLine(line)
	}
	const canAdd = product.inStock && sizeStock > 0

	return (
		<>
			<nav aria-label='Breadcrumb' className={style.breadcrumb}>
				<ol role='list'>
					<li>
						<Link to='/'>Home</Link>
					</li>
					{category && (
						<li>
							<Link to={`/products/${category}`}>
								{CATEGORY_TITLES[category] ?? capitalize(category)}
							</Link>
						</li>
					)}
					<li aria-current='page'>{product.title}</li>
				</ol>
			</nav>

			<article className={style.product}>
				<div className={style.media}>
					<ProductGallery images={product.images} title={product.title} />
				</div>

				<div className={style.info}>
					<div>
						<Link
							to={`/products?brand=${encodeURIComponent(product.brand)}`}
							className={style.brand}
						>
							{product.brand}
						</Link>
						<h1 className={style.title}>{product.title}</h1>
					</div>
					<div className={style.priceRow}>
						<Price product={product} size='lg' />
						{product.rating?.count > 0 && (
							<a href='#reviews' className={style.ratingLink}>
								<RatingStars value={product.rating.average} count={product.rating.count} />
							</a>
						)}
					</div>
					<p className={style.description}>{product.description}</p>

					{product.colors.length > 0 && (
						<OptionPicker
							legend='Color'
							name='color'
							variant='swatch'
							options={product.colors}
							value={color}
							onChange={setColor}
						/>
					)}
					{!isOneSize && (
						<div className={style.sizes}>
							<SizePicker sizes={product.sizes} value={size} onChange={setSize} />
							<SizeGuide sizes={product.sizes.map((s) => s.label)} />
						</div>
					)}

					{product.inStock ? (
						<div className={style.purchase} ref={purchaseRef}>
							<QuantityStepper
								value={quantity}
								onChange={setQuantity}
								max={Math.min(MAX_QUANTITY, sizeStock || 1)}
							/>
							<Button fullWidth onClick={handleAdd} disabled={!canAdd}>
								Add to bag
							</Button>
							<WishlistButton productId={product._id} variant='button' />
						</div>
					) : (
						<Alert>This product is sold out.</Alert>
					)}

					<p className={style.note}>
						<Truck size={16} aria-hidden /> Free shipping on orders over{' '}
						{formatMoney(FREE_SHIPPING_FROM)}
					</p>
				</div>
			</article>
			{canAdd && (
				<div className={style.stickyBar} hidden={!showStickyBar}>
					<div className={style.stickyInfo}>
						<p className={style.stickyTitle}>{product.title}</p>
						<Price product={product} />
					</div>
					<Button onClick={handleAdd}>Add to bag{isOneSize ? '' : ` · ${size}`}</Button>
				</div>
			)}

			{addedLine && <MiniBag addedLine={addedLine} onClose={() => setAddedLine(null)} />}

			{/* target of the rating link above */}
			<div id='reviews'>
				<ProductReviews product={product} />
			</div>
		</>
	)
}

export default ProductDetails
