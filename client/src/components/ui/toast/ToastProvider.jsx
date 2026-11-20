import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { cx } from '../../../utils/cx'
import { ToastContext } from './ToastContext'
import style from './Toast.module.css'

const DURATION_MS = 4500
const MAX_VISIBLE = 3
const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

let nextId = 0

/** Short-lived notifications in a live region at the bottom of the screen. */
export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([])
	const timers = useRef(new Map())

	const dismiss = useCallback((id) => {
		clearTimeout(timers.current.get(id))
		timers.current.delete(id)
		setToasts((current) => current.filter((t) => t.id !== id))
	}, [])

	/**
	 * @param toast.message text
	 * @param toast.tone 'success' | 'error' | 'info'
	 * @param toast.action optional link `{ label, to }`
	 */
	const show = useCallback(
		({ message, tone = 'info', action }) => {
			const id = ++nextId
			setToasts((current) => [...current, { id, message, tone, action }].slice(-MAX_VISIBLE))
			timers.current.set(
				id,
				setTimeout(() => dismiss(id), DURATION_MS),
			)
		},
		[dismiss],
	)

	useEffect(() => {
		const pending = timers.current
		return () => pending.forEach(clearTimeout)
	}, [])

	const value = useMemo(() => ({ show }), [show])

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className={style.region} role='status' aria-live='polite'>
				{toasts.map(({ id, message, tone, action }) => {
					const Icon = ICONS[tone]
					return (
						<div key={id} className={cx(style.toast, style[tone])}>
							<Icon size={18} aria-hidden className={style.icon} />
							<p className={style.message}>{message}</p>
							{action && (
								<Link to={action.to} className={style.action} onClick={() => dismiss(id)}>
									{action.label}
								</Link>
							)}
							<button
								type='button'
								className={style.close}
								onClick={() => dismiss(id)}
								aria-label='Dismiss notification'
							>
								<X size={16} aria-hidden />
							</button>
						</div>
					)
				})}
			</div>
		</ToastContext.Provider>
	)
}
