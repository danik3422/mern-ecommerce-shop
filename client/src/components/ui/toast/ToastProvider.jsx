import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../../../i18n/useI18n'
import { cx } from '../../../utils/cx'
import { ToastContext } from './ToastContext'
import style from './Toast.module.css'

// errors stay longer: they usually need reading
const DURATION_MS = { success: 4000, info: 5000, error: 8000 }
const MAX_VISIBLE = 3
const ICONS = { success: CheckCircle2, error: XCircle, info: Info }

let nextId = 0

/**
 * Short-lived notifications ("Saved", "Could not delete…") as cards in a corner of the screen.
 * Hovering a card pauses its timer; errors are announced immediately to screen readers.
 */
export const ToastProvider = ({ children }) => {
	const [toasts, setToasts] = useState([])
	const { t } = useI18n()
	const timers = useRef(new Map())

	const dismiss = useCallback((id) => {
		clearTimeout(timers.current.get(id)?.timeout)
		timers.current.delete(id)
		setToasts((current) => current.filter((t) => t.id !== id))
	}, [])

	/**
	 * @param toast.message text
	 * @param toast.tone 'success' | 'error' | 'info'
	 * @param toast.action optional link `{ label, to }`
	 */
	/** Closes the toast after `remaining` ms; remembers when, so hovering can pause it. */
	const startTimer = useCallback(
		(id, remaining) => {
			clearTimeout(timers.current.get(id)?.timeout)
			timers.current.set(id, {
				remaining,
				startedAt: Date.now(),
				timeout: setTimeout(() => dismiss(id), remaining),
			})
		},
		[dismiss],
	)

	/**
	 * @param toast.title optional bold first line
	 * @param toast.message text
	 * @param toast.tone 'success' | 'error' | 'info'
	 * @param toast.action optional link `{ label, to }`
	 */
	const show = useCallback(
		({ title, message, tone = 'info', action }) => {
			const id = ++nextId
			const duration = DURATION_MS[tone] ?? DURATION_MS.info
			setToasts((current) =>
				[...current, { id, title, message, tone, action, duration }].slice(-MAX_VISIBLE),
			)
			startTimer(id, duration)
		},
		[startTimer],
	)

	// hovering pauses the timer (and the progress bar in CSS); leaving continues with the time left
	const pause = useCallback((id) => {
		const timer = timers.current.get(id)
		if (!timer?.timeout) return
		clearTimeout(timer.timeout)
		timers.current.set(id, {
			remaining: timer.remaining - (Date.now() - timer.startedAt),
			timeout: null,
		})
	}, [])
	const resume = useCallback(
		(id) => {
			const timer = timers.current.get(id)
			if (timer && !timer.timeout) startTimer(id, Math.max(timer.remaining, 1000))
		},
		[startTimer],
	)

	useEffect(() => {
		const pending = timers.current
		return () => pending.forEach((timer) => clearTimeout(timer.timeout))
	}, [])

	const value = useMemo(() => ({ show }), [show])

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className={style.region}>
				{toasts.map(({ id, title, message, tone, action, duration }) => {
					const Icon = ICONS[tone]
					return (
						<div
							key={id}
							className={cx(style.toast, style[tone])}
							role={tone === 'error' ? 'alert' : 'status'}
							onMouseEnter={() => pause(id)}
							onMouseLeave={() => resume(id)}
							style={{ '--duration': `${duration}ms` }}
						>
							<span className={style.icon} aria-hidden>
								<Icon size={18} />
							</span>
							<div className={style.text}>
								{title && <p className={style.title}>{title}</p>}
								<p className={style.message}>{message}</p>
								{action && (
									<Link to={action.to} className={style.action} onClick={() => dismiss(id)}>
										{action.label}
									</Link>
								)}
							</div>
							<button
								type='button'
								className={style.close}
								onClick={() => dismiss(id)}
								aria-label={t('common.dismiss')}
							>
								<X size={16} aria-hidden />
							</button>
							<span className={style.progress} aria-hidden />
						</div>
					)
				})}
			</div>
		</ToastContext.Provider>
	)
}
