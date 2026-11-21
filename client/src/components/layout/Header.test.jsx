import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header'

vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }))
vi.mock('../../cart/useCart', () => ({ useCart: () => ({ count: 3 }) }))
vi.mock('../../hooks/useShopConfig', () => ({ useShopConfig: () => undefined }))

const renderHeader = (path = '/products/men') =>
	render(
		<QueryClientProvider client={new QueryClient()}>
			<MemoryRouter initialEntries={[path]}>
				<Header />
			</MemoryRouter>
		</QueryClientProvider>,
	)

describe('Header', () => {
	it('marks the current category and names the icon actions', () => {
		renderHeader()
		const nav = screen.getByRole('navigation', { name: 'Main' })
		expect(within(nav).getByRole('link', { name: 'Men' })).toHaveAttribute('aria-current', 'page')
		expect(screen.getByRole('link', { name: 'Bag, 3 items' })).toHaveAttribute('href', '/cart')
		expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
	})

	it('opens the menu drawer, closes it with Escape and returns focus to the trigger', () => {
		renderHeader()
		const trigger = screen.getByRole('button', { name: 'Open menu' })
		trigger.focus()
		fireEvent.click(trigger)

		const menu = screen.getByRole('dialog', { name: 'Menu' })
		expect(within(menu).getByRole('link', { name: 'Women' })).toBeInTheDocument()
		expect(within(menu).getByRole('combobox', { name: 'Language' })).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
	})

	it('opens a search panel focused on the field; Escape closes it', () => {
		renderHeader()
		fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
		const fields = screen.getAllByRole('combobox', { name: 'Search products and brands' })
		const panelField = fields.at(-1)
		expect(panelField).toHaveFocus()

		fireEvent.keyDown(panelField, { key: 'Escape' }) // closes the suggestions
		fireEvent.keyDown(panelField, { key: 'Escape' }) // closes the panel
		expect(screen.getAllByRole('combobox', { name: 'Search products and brands' })).toHaveLength(1)
		expect(screen.getByRole('button', { name: 'Open search' })).toHaveFocus()
	})
})
