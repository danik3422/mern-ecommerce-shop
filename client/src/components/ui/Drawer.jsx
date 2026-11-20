import { X } from 'lucide-react'
import { useId } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../hooks/useModal'
import { cx } from '../../utils/cx'
import style from './Drawer.module.css'

/**
 * Side panel dialog (filters on mobile, mini bag). Render it only while open.
 * @param side 'left' | 'right'
 * @param footer content pinned to the bottom, e.g. action buttons
 */
const Drawer = ({ title, side = 'right', onClose, footer, children, closeLabel = 'Close' }) => {
	const dialogRef = useModal(onClose)
	const titleId = useId()

	return createPortal(
		<div className={style.root}>
			<div className={style.backdrop} onClick={onClose} aria-hidden />
			<div
				ref={dialogRef}
				className={cx(style.panel, style[side])}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<div className={style.header}>
					<h2 id={titleId} className={style.title}>
						{title}
					</h2>
					<button
						type='button'
						className={style.close}
						onClick={onClose}
						aria-label={closeLabel}
						data-autofocus
					>
						<X size={20} aria-hidden />
					</button>
				</div>
				<div className={style.body}>{children}</div>
				{footer && <div className={style.footer}>{footer}</div>}
			</div>
		</div>,
		document.body,
	)
}

export default Drawer
