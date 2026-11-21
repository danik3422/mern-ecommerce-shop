import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import Modal from '../ui/Modal'
import style from './ImageViewer.module.css'
import { useSnapCarousel } from './useSnapCarousel'

const ZOOM = 2
const MAX_ZOOM = 4
const DOUBLE_TAP_MS = 300
const TAP_SLOP = 8 // px a finger may move and still count as a tap
const CLOSE_DISTANCE = 120 // px to swipe down to close

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * Full-screen photo viewer (focus trap, Esc and scroll lock come from Modal).
 * Photos swipe sideways (scroll-snap); arrows, thumbnails and ← → switch them.
 * Zoom: a mouse click zooms 2× and the photo follows the pointer; on touch screens
 * double-tap zooms, one finger pans and two fingers pinch. Swiping down closes.
 *
 * @param onClose called with the index of the photo shown last
 */
const ImageViewer = ({ images, title, startIndex = 0, onClose }) => {
	const { t } = useI18n()
	const count = images.length
	const { trackRef, index, goTo, handleScroll } = useSnapCarousel(count, startIndex)
	// { index, scale, x, y } — x/y shift the photo from its centre, in px
	const [zoom, setZoom] = useState(null)
	const [dragY, setDragY] = useState(0) // swipe-down-to-close offset
	const [isTouching, setIsTouching] = useState(false) // no transitions while a finger moves
	const pointers = useRef(new Map())
	const gesture = useRef(null)
	const lastTap = useRef(null)
	const pointerType = useRef('mouse')

	// zoom belongs to one photo; switching photos shows the next one unzoomed
	const activeZoom = zoom?.index === index ? zoom : null
	const close = () => onClose(index)

	// open on the photo that was clicked, without animating there
	useLayoutEffect(() => {
		const track = trackRef.current
		track.scrollLeft = startIndex * track.clientWidth
	}, [trackRef, startIndex])

	const show = (next) => {
		setZoom(null)
		goTo(next)
	}

	// --- geometry, measured during events only ---

	const currentImage = () => trackRef.current.children[index].querySelector('img')

	/** Point relative to the centre of the current photo (untransformed). */
	const fromCentre = (clientX, clientY) => {
		const slide = currentImage().parentElement.getBoundingClientRect()
		return { x: clientX - slide.left - slide.width / 2, y: clientY - slide.top - slide.height / 2 }
	}

	/** Zoom state that keeps the photo covering its own box. */
	const bounded = (scale, x, y) => {
		if (scale <= 1) return null
		const image = currentImage()
		const maxX = ((scale - 1) * image.offsetWidth) / 2
		const maxY = ((scale - 1) * image.offsetHeight) / 2
		return { index, scale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
	}

	/** Scale to `scale` keeping the point under the pointer in place. */
	const zoomAt = (scale, clientX, clientY, from = activeZoom ?? { scale: 1, x: 0, y: 0 }) => {
		const p = fromCentre(clientX, clientY)
		const x = p.x - (scale * (p.x - from.x)) / from.scale
		const y = p.y - (scale * (p.y - from.y)) / from.scale
		setZoom(bounded(scale, x, y))
	}

	/** Mouse: the zoomed photo follows the pointer, edge to edge. */
	const follow = (clientX, clientY) => {
		const image = currentImage()
		const p = fromCentre(clientX, clientY)
		const x = clamp(p.x, -image.offsetWidth / 2, image.offsetWidth / 2)
		const y = clamp(p.y, -image.offsetHeight / 2, image.offsetHeight / 2)
		setZoom(bounded(activeZoom.scale, -x * (activeZoom.scale - 1), -y * (activeZoom.scale - 1)))
	}

	const toggleZoomAt = (clientX, clientY) => {
		if (activeZoom) setZoom(null)
		else zoomAt(ZOOM, clientX, clientY)
	}

	// --- pointer handling on the track ---

	const handleClick = (e) => {
		// touch taps are handled as double taps; keyboard uses the zoom button
		if (pointerType.current !== 'mouse' || e.target.tagName !== 'IMG') return
		toggleZoomAt(e.clientX, e.clientY)
	}

	const handlePointerDown = (e) => {
		pointerType.current = e.pointerType
		if (e.pointerType === 'mouse') return
		const point = { x: e.clientX, y: e.clientY }
		pointers.current.set(e.pointerId, point)
		setIsTouching(true)

		if (pointers.current.size === 2) {
			const [a, b] = pointers.current.values()
			gesture.current = {
				type: 'pinch',
				distance: distance(a, b),
				centre: fromCentre(midpoint(a, b).x, midpoint(a, b).y),
				from: activeZoom ?? { scale: 1, x: 0, y: 0 },
			}
		} else if (pointers.current.size === 1) {
			gesture.current = { type: activeZoom ? 'pan' : 'swipe', start: point, from: activeZoom }
		}
	}

	const handlePointerMove = (e) => {
		if (e.pointerType === 'mouse') {
			if (activeZoom) follow(e.clientX, e.clientY)
			return
		}
		if (!pointers.current.has(e.pointerId)) return
		pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
		const g = gesture.current
		if (!g) return

		if (g.type === 'pinch') {
			const [a, b] = pointers.current.values()
			const scale = clamp((g.from.scale * distance(a, b)) / g.distance, 1, MAX_ZOOM)
			const centre = fromCentre(midpoint(a, b).x, midpoint(a, b).y)
			// the point between the fingers stays between the fingers
			const x = centre.x - (scale * (g.centre.x - g.from.x)) / g.from.scale
			const y = centre.y - (scale * (g.centre.y - g.from.y)) / g.from.scale
			setZoom(bounded(scale, x, y))
			return
		}

		const dx = e.clientX - g.start.x
		const dy = e.clientY - g.start.y
		if (Math.hypot(dx, dy) > TAP_SLOP) g.moved = true
		if (g.type === 'pan') setZoom(bounded(g.from.scale, g.from.x + dx, g.from.y + dy))
		else if (dy > 0 && dy > Math.abs(dx)) setDragY(dy)
	}

	const handlePointerEnd = (e) => {
		if (!pointers.current.delete(e.pointerId)) return
		const g = gesture.current
		if (pointers.current.size === 0) setIsTouching(false)
		// lifting one finger of a pinch ends the gesture
		if (pointers.current.size > 0 || !g) {
			gesture.current = null
			return
		}
		gesture.current = null

		if (g.type === 'swipe' && dragY > 0) {
			if (dragY > CLOSE_DISTANCE && e.type === 'pointerup') close()
			else setDragY(0)
			return
		}
		if (g.moved || g.type === 'pinch' || e.type !== 'pointerup') return

		const tap = { time: e.timeStamp, x: e.clientX, y: e.clientY }
		const previous = lastTap.current
		if (previous && tap.time - previous.time < DOUBLE_TAP_MS && distance(tap, previous) < 40) {
			lastTap.current = null
			toggleZoomAt(tap.x, tap.y)
		} else {
			lastTap.current = tap
		}
	}

	const handleKeyDown = (e) => {
		if (count < 2) return
		const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
		if (!step) return
		e.preventDefault()
		show(index + step)
	}

	const toggleZoomButton = () => setZoom(activeZoom ? null : { index, scale: ZOOM, x: 0, y: 0 })

	return (
		<Modal
			title={t('gallery.viewerTitle', { title, index: index + 1, count })}
			size='full'
			hideTitle
			onClose={close}
		>
			{/* keyboard support for the whole viewer; the arrows are also buttons */}
			<div
				className={cx(
					style.viewer,
					activeZoom && style.zoomed,
					isTouching && style.touching,
					count < 2 && style.single,
				)}
				style={dragY ? { '--drag': `${dragY}px`, '--fade': 1 - dragY / 600 } : undefined}
				onKeyDown={handleKeyDown}
			>
				{count > 1 && (
					<p className={style.counter} aria-hidden>
						{index + 1} / {count}
					</p>
				)}
				<button
					type='button'
					className={cx(style.control, style.zoomButton)}
					onClick={toggleZoomButton}
					aria-label={activeZoom ? t('gallery.zoomOut') : t('gallery.zoomIn')}
				>
					{activeZoom ? <ZoomOut size={20} aria-hidden /> : <ZoomIn size={20} aria-hidden />}
				</button>

				<div
					ref={trackRef}
					className={style.track}
					onScroll={handleScroll}
					onClick={handleClick}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerEnd}
					onPointerCancel={handlePointerEnd}
				>
					{images.map((src, i) => {
						const z = i === index && activeZoom
						return (
							<div key={src} className={style.slide} aria-hidden={i !== index}>
								<img
									className={style.image}
									src={src}
									alt={t('gallery.alt', { title, index: i + 1 })}
									loading={Math.abs(i - index) <= 1 ? 'eager' : 'lazy'}
									draggable={false}
									style={
										z ? { transform: `translate(${z.x}px, ${z.y}px) scale(${z.scale})` } : undefined
									}
								/>
							</div>
						)
					})}
				</div>

				{count > 1 && (
					<>
						<button
							type='button'
							className={cx(style.control, style.arrow, style.prev)}
							onClick={() => show(index - 1)}
							aria-label={t('gallery.previous')}
						>
							<ChevronLeft size={24} aria-hidden />
						</button>
						<button
							type='button'
							className={cx(style.control, style.arrow, style.next)}
							onClick={() => show(index + 1)}
							aria-label={t('gallery.next')}
						>
							<ChevronRight size={24} aria-hidden />
						</button>
						<ul role='list' className={style.thumbnails} aria-label={t('gallery.thumbnails')}>
							{images.map((src, i) => (
								<li key={src}>
									<button
										type='button'
										className={cx(style.thumbnail, i === index && style.active)}
										onClick={() => show(i)}
										aria-label={t('gallery.show', { index: i + 1, count })}
										aria-current={i === index}
									>
										<img src={src} alt='' loading='lazy' draggable={false} />
									</button>
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		</Modal>
	)
}

export default ImageViewer
