import { useConfirm } from '../components/ui/confirm/useConfirm'

/**
 * The shared confirm popup with English labels (its defaults follow the shop language,
 * the admin panel is English-only).
 * `if (await confirm({ title: 'Delete product?', message, confirmLabel: 'Delete', tone: 'danger' }))`
 */
export const useAdminConfirm = () => {
	const confirm = useConfirm()
	return ({ confirmLabel = 'Confirm', cancelLabel = 'Cancel', ...options }) =>
		confirm({ confirmLabel, cancelLabel, ...options })
}
