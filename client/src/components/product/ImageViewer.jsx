import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../../utils/cx'
import Modal from '../ui/Modal'
import style from './ImageViewer.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Full-screen image viewer: arrows / ← → switch images, clicking the image
 * zooms in at that point (click again to zoom out).
 */
const ImageViewer = ({ images, title, startIndex = 0, onClose }) => {
	const { t } = useI18n()
	const [index, setIndex] = useState(startIndex)
	const [zoom, setZoom] = useState(null) // { x, y } in percent while zoomed in
	const count = images.length

	const show = (next) => {
		setZoom(null)
		setIndex((next + count) % count)
	}

	const handleKeyDown = (e) => {
		if (count < 2) return
		if (e.key === 'ArrowRight') show(index + 1)
		if (e.key === 'ArrowLeft') show(index - 1)
	}

	const toggleZoom = (e) => {
		if (zoom) return setZoom(null)
		const rect = e.currentTarget.getBoundingClientRect()
		setZoom({
			x: ((e.clientX - rect.left) / rect.width) * 100,
			y: ((e.clientY - rect.top) / rect.height) * 100,
		})
	}

	return (
		<Modal
			title={t('gallery.viewerTitle', { title, index: index + 1, count })}
			size='full'
			hideTitle
			onClose={onClose}
		>
			{/* keyboard support for the whole viewer; the arrows are also buttons */}
			<div className={style.viewer} onKeyDown={handleKeyDown}>
				<button
					type='button'
					className={cx(style.stage, zoom && style.zoomed)}
					onClick={toggleZoom}
					aria-label={zoom ? t('gallery.zoomOut') : t('gallery.zoomIn')}
				>
					<img
						className={style.image}
						src={images[index]}
						alt={t('gallery.alt', { title, index: index + 1 })}
						style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
					/>
				</button>
				{count > 1 && (
					<>
						<button
							type='button'
							className={cx(style.arrow, style.prev)}
							onClick={() => show(index - 1)}
							aria-label={t('gallery.previous')}
						>
							<ChevronLeft size={24} aria-hidden />
						</button>
						<button
							type='button'
							className={cx(style.arrow, style.next)}
							onClick={() => show(index + 1)}
							aria-label={t('gallery.next')}
						>
							<ChevronRight size={24} aria-hidden />
						</button>
						<p className={style.counter} aria-hidden>
							{index + 1} / {count}
						</p>
					</>
				)}
			</div>
		</Modal>
	)
}

export default ImageViewer
