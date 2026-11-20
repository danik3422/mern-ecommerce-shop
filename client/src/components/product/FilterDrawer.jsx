import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import style from './FilterDrawer.module.css'

/**
 * Modal side panel for filters on small screens.
 * Focuses the close button on open, closes on Escape or a backdrop click,
 * stops the page from scrolling and returns focus to the trigger when closed.
 */
const FilterDrawer = ({ title, onClose, children, footer }) => {
	const closeButton = useRef(null)

	useEffect(() => {
		const previouslyFocused = document.activeElement
		const { overflow } = document.body.style
		document.body.style.overflow = 'hidden'
		closeButton.current?.focus()

		const handleKeyDown = (e) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = overflow
			previouslyFocused?.focus?.()
		}
	}, [onClose])

	return (
		<div className={style.root}>
			<div className={style.backdrop} onClick={onClose} aria-hidden />
			<div
				className={style.panel}
				role='dialog'
				aria-modal='true'
				aria-labelledby='filter-drawer-title'
			>
				<div className={style.header}>
					<h2 id='filter-drawer-title' className={style.title}>
						{title}
					</h2>
					<button
						ref={closeButton}
						type='button'
						className={style.close}
						onClick={onClose}
						aria-label='Close filters'
					>
						<X size={20} aria-hidden />
					</button>
				</div>
				<div className={style.body}>{children}</div>
				{footer && <div className={style.footer}>{footer}</div>}
			</div>
		</div>
	)
}

export default FilterDrawer
