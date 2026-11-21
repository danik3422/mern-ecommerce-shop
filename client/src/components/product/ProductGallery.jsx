import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import ImageViewer from './ImageViewer'
import style from './ProductGallery.module.css'
import { useSnapCarousel } from './useSnapCarousel'

/**
 * Product photos. A horizontal scroll-snap track (swipe on touch screens, arrows,
 * thumbnails and ← → keys on desktop) with a counter and dots. Clicking a photo
 * or the expand button opens the full-screen viewer.
 */
const ProductGallery = ({ images, title }) => {
	const { t } = useI18n()
	const count = images.length
	const hasMany = count > 1
	const { trackRef, index, goTo, handleScroll } = useSnapCarousel(count)
	// index of the photo the full-screen viewer opens with; null while it is closed
	const [viewerIndex, setViewerIndex] = useState(null)

	const handleKeyDown = (e) => {
		if (!hasMany) return
		const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
		if (!step) return
		e.preventDefault()
		goTo(index + step)
	}

	// the gallery follows the photo the viewer was closed on
	const closeViewer = (lastIndex) => {
		setViewerIndex(null)
		if (lastIndex !== index) goTo(lastIndex, { smooth: false })
	}

	const altOf = (i) => (hasMany ? t('gallery.alt', { title, index: i + 1 }) : title)

	return (
		<section
			className={style.gallery}
			aria-roledescription={hasMany ? 'carousel' : undefined}
			aria-label={t('gallery.images', { title })}
		>
			{hasMany && (
				<ul role='list' className={style.thumbnails} aria-label={t('gallery.thumbnails')}>
					{images.map((src, i) => (
						<li key={src}>
							<button
								type='button'
								className={cx(style.thumbnail, i === index && style.active)}
								onClick={() => goTo(i)}
								aria-label={t('gallery.show', { index: i + 1, count })}
								aria-current={i === index}
							>
								<img src={src} alt='' loading='lazy' draggable={false} />
							</button>
						</li>
					))}
				</ul>
			)}

			<div className={style.stage}>
				<div
					ref={trackRef}
					className={style.track}
					onScroll={handleScroll}
					onKeyDown={handleKeyDown}
					role='group'
					tabIndex={hasMany ? 0 : undefined}
					aria-label={hasMany ? t('gallery.instructions', { index: index + 1, count }) : undefined}
				>
					{images.map((src, i) => (
						<div key={src} className={style.slide}>
							<img
								className={style.image}
								src={src}
								alt={altOf(i)}
								// the visible photo and the next one load right away
								loading={i <= index + 1 ? 'eager' : 'lazy'}
								draggable={false}
								onClick={() => setViewerIndex(i)}
							/>
						</div>
					))}
				</div>

				<button
					type='button'
					className={style.expand}
					onClick={() => setViewerIndex(index)}
					aria-label={t('gallery.openFullscreen')}
					title={t('gallery.fullscreen')}
				>
					<Maximize2 size={18} aria-hidden />
				</button>

				{hasMany && (
					<>
						<button
							type='button'
							className={cx(style.arrow, style.prev)}
							onClick={() => goTo(index - 1)}
							aria-label={t('gallery.previous')}
						>
							<ChevronLeft size={20} aria-hidden />
						</button>
						<button
							type='button'
							className={cx(style.arrow, style.next)}
							onClick={() => goTo(index + 1)}
							aria-label={t('gallery.next')}
						>
							<ChevronRight size={20} aria-hidden />
						</button>
						<p className={style.counter} aria-live='polite'>
							<span aria-hidden>
								{index + 1} / {count}
							</span>
							<span className='visually-hidden'>
								{t('gallery.position', { index: index + 1, count })}
							</span>
						</p>
						<div className={style.dots} aria-hidden>
							{images.map((src, i) => (
								<span key={src} className={cx(style.dot, i === index && style.activeDot)} />
							))}
						</div>
					</>
				)}
			</div>

			{viewerIndex !== null && (
				<ImageViewer images={images} title={title} startIndex={viewerIndex} onClose={closeViewer} />
			)}
		</section>
	)
}

export default ProductGallery
