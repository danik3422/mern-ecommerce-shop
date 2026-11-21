import { ChevronLeft, ChevronRight, Shirt } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { cx } from '../../utils/cx'
import style from './CardImages.module.css'
import { useI18n } from '../../i18n/useI18n'

const MAX_IMAGES = 5

/** Photos shown on a card: those of the first color in stock (else the first color), max 5. */
const cardImages = (product) => {
	const variants = product.variants ?? []
	const variant =
		variants.find((v) => v.sizes.some((size) => size.stock > 0) && v.images?.length) ?? variants[0]
	const images = variant?.images?.length ? variant.images : (product.images ?? [])
	return images.slice(0, MAX_IMAGES)
}

/**
 * Photo area of a product card.
 * Mouse: hovering crossfades to the second photo, arrows switch photos, segments show which one.
 * Touch: a native scroll-snap strip that is swiped horizontally, with dots.
 * The photos are a link to the product, hidden from assistive tech because the card title
 * is the accessible link. `children` are overlays (badges, wishlist, quick add).
 */
const CardImages = ({ product, children }) => {
	const { t } = useI18n()
	const images = cardImages(product)
	const count = images.length
	const [isHovered, setIsHovered] = useState(false)
	// photo picked with the arrows or by swiping; null = default (hover shows the second)
	const [chosen, setChosen] = useState(null)
	const shown = chosen ?? (isHovered && count > 1 ? 1 : 0)

	const step = (delta) => setChosen((shown + delta + count) % count)

	const handleScroll = (e) => {
		const { scrollLeft, clientWidth } = e.currentTarget
		if (clientWidth) setChosen(Math.round(scrollLeft / clientWidth))
	}

	return (
		<div
			className={cx(style.media, !product.inStock && style.soldOut)}
			onPointerEnter={(e) => e.pointerType === 'mouse' && setIsHovered(true)}
			onPointerLeave={(e) => {
				if (e.pointerType !== 'mouse') return
				setIsHovered(false)
				setChosen(null)
			}}
		>
			<Link to={`/product/${product.slug}`} className={style.link} tabIndex={-1} aria-hidden>
				{count ? (
					<div className={style.track} onScroll={handleScroll}>
						{images.map((src, index) => (
							<div key={src} className={style.slide} data-active={index === shown || undefined}>
								<img
									className={style.image}
									src={src}
									alt={t('card.photoAlt', { title: product.title, index: index + 1, count })}
									loading='lazy'
									decoding='async'
									draggable={false}
								/>
							</div>
						))}
					</div>
				) : (
					<div className={style.placeholder}>
						<Shirt size={40} strokeWidth={1} aria-hidden />
					</div>
				)}
			</Link>

			{count > 1 && (
				<>
					<button
						type='button'
						className={cx(style.arrow, style.prev)}
						onClick={() => step(-1)}
						aria-label={t('card.previousPhoto', { title: product.title })}
					>
						<ChevronLeft size={18} aria-hidden />
					</button>
					<button
						type='button'
						className={cx(style.arrow, style.next)}
						onClick={() => step(1)}
						aria-label={t('card.nextPhoto', { title: product.title })}
					>
						<ChevronRight size={18} aria-hidden />
					</button>
					<div className={style.dots} aria-hidden>
						{images.map((src, index) => (
							<span key={src} className={cx(style.dot, index === shown && style.dotActive)} />
						))}
					</div>
				</>
			)}

			{children}
		</div>
	)
}

export default CardImages
