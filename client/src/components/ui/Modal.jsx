import { X } from 'lucide-react'
import { useId } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../hooks/useModal'
import { cx } from '../../utils/cx'
import style from './Modal.module.css'

/**
 * Centered dialog. Render it only while open.
 * @param size 'md' | 'full' (full-screen, e.g. an image viewer)
 * @param hideTitle keep the title for screen readers only
 */
const Modal = ({ title, onClose, size = 'md', hideTitle = false, children }) => {
	const dialogRef = useModal(onClose)
	const titleId = useId()

	return createPortal(
		<div className={cx(style.root, style[size])}>
			<div className={style.backdrop} onClick={onClose} aria-hidden />
			<div
				ref={dialogRef}
				className={style.dialog}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<div className={cx(style.header, hideTitle && style.floatingHeader)}>
					<h2 id={titleId} className={cx(style.title, hideTitle && 'visually-hidden')}>
						{title}
					</h2>
					<button
						type='button'
						className={style.close}
						onClick={onClose}
						aria-label='Close'
						data-autofocus
					>
						<X size={20} aria-hidden />
					</button>
				</div>
				<div className={style.body}>{children}</div>
			</div>
		</div>,
		document.body,
	)
}

export default Modal
