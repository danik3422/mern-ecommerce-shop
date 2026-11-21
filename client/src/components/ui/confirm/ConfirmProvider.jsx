import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../../../hooks/useModal'
import { useI18n } from '../../../i18n/useI18n'
import { cx } from '../../../utils/cx'
import Button from '../Button'
import { ConfirmContext } from './ConfirmContext'
import style from './ConfirmDialog.module.css'

/**
 * The popup itself. Escape, a click outside and "Cancel" answer no.
 * For dangerous actions the focus starts on "Cancel", so Enter never deletes by accident.
 */
const ConfirmDialog = ({ options, onAnswer }) => {
	const { t } = useI18n()
	const dialogRef = useModal(() => onAnswer(false))
	const titleId = useId()
	const messageId = useId()
	const { title, message, confirmLabel, cancelLabel, tone = 'default' } = options
	const isDanger = tone === 'danger'
	const Icon = isDanger ? AlertTriangle : HelpCircle

	return createPortal(
		<div className={style.root}>
			<div className={style.backdrop} onClick={() => onAnswer(false)} aria-hidden />
			<div
				ref={dialogRef}
				className={style.dialog}
				role='alertdialog'
				aria-modal='true'
				aria-labelledby={titleId}
				aria-describedby={message ? messageId : undefined}
				tabIndex={-1}
			>
				<div className={cx(style.icon, isDanger && style.danger)} aria-hidden>
					<Icon size={22} strokeWidth={1.75} />
				</div>
				<div className={style.text}>
					<h2 id={titleId} className={style.title}>
						{title}
					</h2>
					{message && (
						<p id={messageId} className={style.message}>
							{message}
						</p>
					)}
				</div>
				<div className={style.actions}>
					<Button
						variant='secondary'
						onClick={() => onAnswer(false)}
						data-autofocus={isDanger || undefined}
					>
						{cancelLabel ?? t('common.cancel')}
					</Button>
					<Button
						onClick={() => onAnswer(true)}
						className={cx(isDanger && style.dangerButton)}
						data-autofocus={!isDanger || undefined}
					>
						{confirmLabel ?? t('common.confirm')}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	)
}

/** Provides `useConfirm()`: one confirmation popup at a time for the whole app. */
export const ConfirmProvider = ({ children }) => {
	const [request, setRequest] = useState(null)

	/** @param options `{ title, message?, confirmLabel?, cancelLabel?, tone?: 'default' | 'danger' }` */
	const confirm = useCallback(
		(options) =>
			new Promise((resolve) => {
				setRequest((previous) => {
					// a new question replaces an unanswered one, which counts as "no"
					previous?.resolve(false)
					return { options, resolve }
				})
			}),
		[],
	)

	const answer = (result) => {
		request.resolve(result)
		setRequest(null)
	}

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{request && <ConfirmDialog options={request.options} onAnswer={answer} />}
		</ConfirmContext.Provider>
	)
}
