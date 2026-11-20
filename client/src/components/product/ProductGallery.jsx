import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../../utils/cx'
import ImageViewer from './ImageViewer'
import style from './ProductGallery.module.css'

/**
 * Main image with thumbnails. Thumbnails are buttons; on the main image the
 * left/right arrow keys and the previous/next buttons switch images.
 */
const ProductGallery = ({ images, title }) => {
	const [index, setIndex] = useState(0)
	const [isViewerOpen, setIsViewerOpen] = useState(false)
	const count = images.length
	const show = (next) => setIndex((next + count) % count)

	const handleKeyDown = (e) => {
		if (e.key === 'ArrowRight') show(index + 1)
		if (e.key === 'ArrowLeft') show(index - 1)
	}

	const openViewer = () => setIsViewerOpen(true)

	const expandButton = (
		<button
			type='button'
			className={style.expand}
			onClick={openViewer}
			aria-label='Open images in full screen'
			title='Full screen'
		>
			<Maximize2 size={18} aria-hidden />
		</button>
	)

	const viewer = isViewerOpen && (
		<ImageViewer
			images={images}
			title={title}
			startIndex={index}
			onClose={() => setIsViewerOpen(false)}
		/>
	)

	if (count === 1) {
		return (
			<div className={style.gallery}>
				<div className={style.main}>
					<img className={style.image} src={images[0]} alt={title} onClick={openViewer} />
					{expandButton}
				</div>
				{viewer}
			</div>
		)
	}

	return (
		<section
			className={style.gallery}
			aria-roledescription='carousel'
			aria-label={`${title} images`}
		>
			<div
				className={style.main}
				role='group'
				tabIndex={0}
				onKeyDown={handleKeyDown}
				aria-label={`Image ${index + 1} of ${count}. Use the arrow keys to switch images.`}
			>
				<img
					className={style.image}
					src={images[index]}
					alt={`${title}, image ${index + 1}`}
					onClick={openViewer}
				/>
				{expandButton}
				<button
					type='button'
					className={cx(style.arrow, style.prev)}
					onClick={() => show(index - 1)}
					aria-label='Previous image'
				>
					<ChevronLeft size={20} aria-hidden />
				</button>
				<button
					type='button'
					className={cx(style.arrow, style.next)}
					onClick={() => show(index + 1)}
					aria-label='Next image'
				>
					<ChevronRight size={20} aria-hidden />
				</button>
			</div>
			<ul role='list' className={style.thumbnails}>
				{images.map((src, i) => (
					<li key={src}>
						<button
							type='button'
							className={cx(style.thumbnail, i === index && style.active)}
							onClick={() => setIndex(i)}
							aria-label={`Show image ${i + 1} of ${count}`}
							aria-current={i === index}
						>
							<img src={src} alt='' loading='lazy' />
						</button>
					</li>
				))}
			</ul>
			{viewer}
		</section>
	)
}

export default ProductGallery
