import { useEffect, useRef } from 'react'

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Shared behaviour of modal dialogs and drawers:
 * moves focus inside on open, keeps Tab within the dialog, closes on Escape,
 * stops the page from scrolling and returns focus to the trigger on close.
 *
 * @returns ref for the dialog element
 */
export const useModal = (onClose) => {
	const dialogRef = useRef(null)
	// always call the latest onClose without re-running the effect
	const onCloseRef = useRef(onClose)
	useEffect(() => {
		onCloseRef.current = onClose
	})

	useEffect(() => {
		const dialog = dialogRef.current
		const previouslyFocused = document.activeElement
		const { overflow } = document.body.style
		document.body.style.overflow = 'hidden'

		const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)]
		;(dialog.querySelector('[data-autofocus]') ?? focusables()[0] ?? dialog).focus()

		const handleKeyDown = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation()
				onCloseRef.current()
				return
			}
			if (e.key !== 'Tab') return

			const items = focusables()
			if (!items.length) return
			const first = items[0]
			const last = items.at(-1)
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = overflow
			previouslyFocused?.focus?.()
		}
	}, [])

	return dialogRef
}
