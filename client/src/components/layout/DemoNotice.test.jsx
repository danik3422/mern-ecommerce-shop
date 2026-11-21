import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PORTFOLIO_URL, SOURCE_URL } from '../../data/project'
import DemoNotice from './DemoNotice'

describe('DemoNotice', () => {
	beforeEach(() => localStorage.clear())

	it('explains on the first visit that the site is a diploma project, with the links', () => {
		render(<DemoNotice onDecline={vi.fn()} />)

		const dialog = screen.getByRole('alertdialog', { name: 'This is a demo, not a real shop' })
		expect(dialog).toHaveTextContent(/not an online store/)
		expect(dialog).toHaveTextContent(/diploma project/)
		expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', PORTFOLIO_URL)
		expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', SOURCE_URL)
		// an answer is required: the confirm button has the focus, Escape does not close it
		expect(screen.getByRole('button', { name: 'Yes, I understand' })).toHaveFocus()
		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
	})

	it('remembers the confirmation, so it is not shown again', () => {
		const { unmount } = render(<DemoNotice onDecline={vi.fn()} />)
		fireEvent.click(screen.getByRole('button', { name: 'Yes, I understand' }))
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
		unmount()

		render(<DemoNotice onDecline={vi.fn()} />)
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
	})

	it('leaves the site when the visitor declines', () => {
		const leave = vi.fn()
		render(<DemoNotice onDecline={leave} />)
		fireEvent.click(screen.getByRole('button', { name: 'No, leave the site' }))
		expect(leave).toHaveBeenCalled()
		expect(localStorage.getItem('demoNoticeAccepted')).toBeNull()
	})
})
