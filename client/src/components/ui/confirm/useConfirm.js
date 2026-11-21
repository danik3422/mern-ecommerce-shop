import { useContext } from 'react'
import { ConfirmContext } from './ConfirmContext'

// isolated component tests render without the provider: fall back to the browser dialog
const browserConfirm = async ({ title, message }) =>
	window.confirm([title, message].filter(Boolean).join('\n\n'))

/**
 * Asks the user to confirm an action in a popup — use it instead of `window.confirm`:
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title: 'Delete address?', message: '…', confirmLabel: 'Delete', tone: 'danger' })) …
 *
 * @returns `(options) => Promise<boolean>` — true when the user confirmed
 */
export const useConfirm = () => useContext(ConfirmContext) ?? browserConfirm
