import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Drawer from './Drawer'

const Example = () => {
	const [isOpen, setIsOpen] = useState(false)
	return (
		<>
			<button onClick={() => setIsOpen(true)}>Open</button>
			{isOpen && (
				<Drawer title='Filters' onClose={() => setIsOpen(false)} footer={<button>Apply</button>}>
					<input aria-label='Search' />
				</Drawer>
			)}
		</>
	)
}

describe('Drawer', () => {
	it('moves focus inside, keeps Tab within the dialog and closes on Escape', () => {
		render(<Example />)
		const trigger = screen.getByRole('button', { name: 'Open' })
		trigger.focus()
		fireEvent.click(trigger)

		const close = screen.getByRole('button', { name: 'Close' })
		const apply = screen.getByRole('button', { name: 'Apply' })
		expect(close).toHaveFocus()
		expect(document.body.style.overflow).toBe('hidden')

		// Tab from the last element wraps to the first one, Shift+Tab the other way
		apply.focus()
		fireEvent.keyDown(document, { key: 'Tab' })
		expect(close).toHaveFocus()
		fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
		expect(apply).toHaveFocus()

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
		expect(document.body.style.overflow).toBe('')
	})
})
