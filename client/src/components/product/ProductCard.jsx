import { Link } from 'react-router'
import { LOW_STOCK_THRESHOLD, swatchColor } from '../../data/catalog'
import { colorName } from '../../i18n/catalogText'
import { cx } from '../../utils/cx'
import WishlistButton from '../account/WishlistButton'
import RatingStars from '../reviews/RatingStars'
import CardImages from './CardImages'
import Price from './Price'
import QuickAdd from './QuickAdd'
import style from './ProductCard.module.css'
import { useI18n } from '../../i18n/useI18n'

const MAX_SWATCHES = 4
const MAX_BADGES = 2

const totalStock = (product) =>
	(product.variants ?? []).reduce(
		(sum, variant) => sum + variant.sizes.reduce((s, size) => s + size.stock, 0),
		0,
	)

/** Labels over the top-left corner of the image, most important first. */
const badgesOf = (product, t) =>
	[
		!product.inStock && { key: 'soldOut', label: t('card.soldOut'), tone: style.badgeDark },
		product.inStock &&
			product.onSale && { key: 'sale', label: t('card.sale'), tone: style.badgeSale },
		product.isNew && { key: 'new', label: t('card.new') },
		product.inStock &&
			totalStock(product) <= LOW_STOCK_THRESHOLD && {
				key: 'fewLeft',
				label: t('card.fewLeft'),
				tone: style.badgeWarning,
			},
	]
		.filter(Boolean)
		.slice(0, MAX_BADGES)

/** Small color dots ("+N" when there are many); shown for products with several colors. */
const Swatches = ({ colors }) => {
	const { t } = useI18n()
	if (colors.length < 2) return null
	const names = colors.map((color) => colorName(t, color))
	const extra = colors.length - MAX_SWATCHES
	return (
		<p className={style.swatches}>
			<span className='visually-hidden'>
				{t('card.colors', { count: colors.length, names: names.join(', ') })}
			</span>
			{colors.slice(0, MAX_SWATCHES).map((color, i) => (
				<span
					key={color}
					className={style.swatch}
					style={{ backgroundColor: swatchColor(color) }}
					title={names[i]}
					aria-hidden
				/>
			))}
			{extra > 0 && (
				<span className={style.more} aria-hidden>
					+{extra}
				</span>
			)}
		</p>
	)
}

/**
 * Product tile of grids. The text link is stretched over the whole card, so the card is
 * one link (one tab stop); buttons (wishlist, photo arrows, quick add) are siblings layered
 * above it, never inside it.
 */
const ProductCard = ({ product }) => {
	const { t } = useI18n()
	const badges = badgesOf(product, t)
	return (
		// `quick-add-host` lets QuickAdd react to hovering anywhere on the card
		<article className={`${style.card} quick-add-host`}>
			<CardImages product={product}>
				{badges.length > 0 && (
					<ul role='list' className={style.badges}>
						{badges.map((badge) => (
							<li key={badge.key} className={cx(style.badge, badge.tone)}>
								{badge.label}
							</li>
						))}
					</ul>
				)}
				<div className={style.wishlist}>
					<WishlistButton productId={product._id} />
				</div>
				<QuickAdd product={product} />
			</CardImages>

			<Link to={`/product/${product.slug}`} className={cx(style.link, style.info)}>
				<p className={style.brand}>{product.brand}</p>
				<h3 className={style.title}>{product.title}</h3>
				<Price product={product} className={style.price} />
				<div className={style.meta}>
					<Swatches colors={product.colors ?? []} />
					<RatingStars
						value={product.rating?.average ?? 0}
						count={product.rating?.count}
						size={11}
					/>
				</div>
			</Link>
		</article>
	)
}

export const ProductCardSkeleton = () => (
	<div className={style.card} aria-hidden>
		<div className={`${style.media} ${style.pulse}`} />
		<div className={style.info}>
			<div className={`${style.line} ${style.short} ${style.pulse}`} />
			<div className={`${style.line} ${style.pulse}`} />
			<div className={`${style.line} ${style.short} ${style.pulse}`} />
		</div>
	</div>
)

export default ProductCard
