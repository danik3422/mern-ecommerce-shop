import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { useCart } from '../../cart/useCart'
import { findVariant, isVariantInStock, stockOf } from '../../utils/variants'
import { rememberViewedProduct } from '../../hooks/useRecentlyViewed'
import WishlistButton from '../account/WishlistButton'
import MiniBag from '../cart/MiniBag'
import ProductReviews from '../reviews/ProductReviews'
import RatingStars from '../reviews/RatingStars'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import BoughtTogether from './BoughtTogether'
import FitBar from './FitBar'
import NotifyMe from './NotifyMe'
import OptionPicker from './OptionPicker'
import Price from './Price'
import style from './ProductDetails.module.css'
import ProductGallery from './ProductGallery'
import DeliveryInfo from './DeliveryInfo'
import SizeGuide from './SizeGuide'
import SizePicker from './SizePicker'
import { suggestedSize } from './sizeFit'
import { useI18n } from '../../i18n/useI18n'
import { categoryTitle, colorName, localizedText } from '../../i18n/catalogText'

// nothing is preselected when every size is sold out
const firstAvailableSize = (sizes) => sizes.find((s) => s.stock > 0)?.label ?? null

const ProductDetails = ({ product }) => {
	const { t, locale } = useI18n()
	const { addItem, quantityInBag } = useCart()
	const [searchParams, setSearchParams] = useSearchParams()
	// the color lives in the URL (?color=black), so a link opens the same color;
	// unknown colors fall back to the first color that is in stock
	const defaultVariant = product.variants.find(isVariantInStock) ?? product.variants[0]
	const variant = findVariant(product, searchParams.get('color')) ?? defaultVariant
	const color = variant.color
	const [size, setSize] = useState(() => firstAvailableSize(variant.sizes))
	const [quantity, setQuantity] = useState(1)
	// the line just added; opens the mini bag
	const [addedLine, setAddedLine] = useState(null)
	const [showStickyBar, setShowStickyBar] = useState(false)
	const purchaseRef = useRef(null)
	const descriptionId = useId()
	// Polish when translated, otherwise the English text
	const description = localizedText(product.description, locale)

	const category = product.categories[0]
	const sizeStock = stockOf(variant, size)
	// what can still be added: the stock minus what is already in the bag
	const inBag = quantityInBag({ productId: product._id, color, size })
	const available = Math.max(sizeStock - inBag, 0)
	const isOneSize = variant.sizes.length === 1
	const variantInStock = isVariantInStock(variant)
	// reviewers say it runs small or large: suggest the neighbouring size
	const fitVerdict = product.fit?.verdict
	const suggested = suggestedSize(variant.sizes, size, fitVerdict)

	const chooseColor = (nextColor) => {
		const next = findVariant(product, nextColor)
		const params = new URLSearchParams(searchParams)
		params.set('color', nextColor)
		setSearchParams(params, { replace: true, preventScrollReset: true })
		// keep the size when the new color has it in stock, otherwise pick the first available
		if (stockOf(next, size) === 0) setSize(firstAvailableSize(next.sizes))
	}

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
		const line = { productId: product._id, color, size, quantity: Math.min(quantity, available) }
		addItem(line, sizeStock)
		setAddedLine(line)
		setQuantity(1)
	}
	const canAdd = variantInStock && available > 0
	const allInBag = sizeStock > 0 && available === 0

	return (
		<>
			<nav aria-label={t('product.breadcrumb')} className={style.breadcrumb}>
				<ol role='list'>
					<li>
						<Link to='/'>{t('product.home')}</Link>
					</li>
					{category && (
						<li>
							<Link to={`/products/${category}`}>{categoryTitle(t, category)}</Link>
						</li>
					)}
					<li aria-current='page'>{product.title}</li>
				</ol>
			</nav>

			<article className={style.product}>
				<div className={style.media}>
					{/* key restarts the gallery at the first photo of another color */}
					<ProductGallery images={variant.images} title={product.title} key={color} />
				</div>

				<div className={style.info}>
					<div className={style.heading}>
						<Link
							to={`/products?brand=${encodeURIComponent(product.brand)}`}
							className={style.brand}
						>
							{product.brand}
						</Link>
						<h1 className={style.title}>{product.title}</h1>
						<div className={style.priceRow}>
							<Price product={product} size='lg' />
							{product.rating?.count > 0 && (
								<a href='#reviews' className={style.ratingLink}>
									<RatingStars value={product.rating.average} count={product.rating.count} />
								</a>
							)}
						</div>
					</div>

					{product.variants.length > 1 && (
						<OptionPicker
							legend={t('product.color')}
							formatOption={(option) => colorName(t, option)}
							name='color'
							variant='swatch'
							options={product.colors}
							value={color}
							onChange={chooseColor}
						/>
					)}
					{!isOneSize && (
						<div className={style.sizes}>
							<SizePicker
								sizes={variant.sizes}
								value={size}
								onChange={setSize}
								suggested={suggested}
								fitVerdict={fitVerdict}
							/>
							<div className={style.sizeLinks}>
								<SizeGuide sizes={variant.sizes.map((s) => s.label)} />
								{variantInStock && <NotifyMe product={product} variant={variant} />}
							</div>
							<FitBar fit={product.fit} />
						</div>
					)}

					{variantInStock ? (
						<div className={style.purchase} ref={purchaseRef}>
							<QuantityStepper
								value={quantity}
								onChange={setQuantity}
								max={Math.min(MAX_QUANTITY, Math.max(available, 1))}
							/>
							<Button fullWidth onClick={handleAdd} disabled={!canAdd}>
								{t('product.addToBag')}
							</Button>
							<WishlistButton productId={product._id} variant='button' />
						</div>
					) : (
						<div className={style.soldOut}>
							<Alert>
								{product.variants.length > 1 ? t('product.colorSoldOut') : t('product.soldOut')}
							</Alert>
							<NotifyMe product={product} variant={variant} appearance='button' />
						</div>
					)}

					{variantInStock && allInBag && (
						<Alert>{t('product.allInBag', { count: sizeStock })}</Alert>
					)}
					<DeliveryInfo />
					{description && (
						<section className={style.details} aria-labelledby={descriptionId}>
							<h2 id={descriptionId} className={style.detailsTitle}>
								{t('product.description')}
							</h2>
							<p className={style.description}>{description}</p>
						</section>
					)}
				</div>
			</article>

			<BoughtTogether
				product={product}
				variant={variant}
				size={size}
				available={available}
				sizeStock={sizeStock}
			/>

			{canAdd && (
				<div className={style.stickyBar} hidden={!showStickyBar}>
					<div className={style.stickyInfo}>
						<p className={style.stickyTitle}>{product.title}</p>
						<Price product={product} />
					</div>
					<Button onClick={handleAdd}>
						{isOneSize ? t('product.addToBag') : t('product.addToBagSize', { size })}
					</Button>
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
