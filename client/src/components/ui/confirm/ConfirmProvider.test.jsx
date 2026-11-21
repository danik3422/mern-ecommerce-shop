import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConfirmProvider } from './ConfirmProvider'
import { useConfirm } from './useConfirm'

/** A button that asks a question and prints the answer. */
const Asker = ({ tone }) => {
	const confirm = useConfirm()
	return (
		<button
			type='button'
			onClick={async () => {
				const answer = await confirm({
					title: 'Delete this address?',
					message: 'It will be removed.',
					confirmLabel: 'Delete',
					tone,
				})
				document.title = answer ? 'yes' : 'no'
			}}
		>
			Ask
		</button>
	)
}

const renderAsker = (tone) =>
	render(
		<ConfirmProvider>
			<Asker tone={tone} />
		</ConfirmProvider>,
	)

describe('confirmation popup', () => {
	it('resolves true when confirmed and closes', async () => {
		renderAsker()
		fireEvent.click(screen.getByRole('button', { name: 'Ask' }))

		const dialog = await screen.findByRole('alertdialog', { name: 'Delete this address?' })
		expect(dialog).toHaveAccessibleDescription('It will be removed.')
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

		await waitFor(() => expect(document.title).toBe('yes'))
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})

	it('resolves false on Cancel and on Escape', async () => {
		renderAsker()
		fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
		fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
		await waitFor(() => expect(document.title).toBe('no'))

		document.title = ''
		fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
		await screen.findByRole('alertdialog')
		fireEvent.keyDown(document, { key: 'Escape' })
		await waitFor(() => expect(document.title).toBe('no'))
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})

	it('puts the focus on Cancel for dangerous actions, so Enter does not delete', async () => {
		renderAsker('danger')
		fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
		await screen.findByRole('alertdialog')
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
	})
})
