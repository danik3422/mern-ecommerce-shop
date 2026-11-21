import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import RequireAuth from '../../auth/RequireAuth'
import { renderWithProviders } from '../../components/account/test-utils'
import { restoreSessionAs } from '../../test/session'
import SecurityPage from './SecurityPage'

vi.mock('../../api/auth', async (importOriginal) => ({
	...(await importOriginal()),
	fetchSessions: vi.fn(),
	revokeSession: vi.fn(),
	revokeOtherSessions: vi.fn(),
}))

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()

const sessions = [
	{
		id: 's1',
		browser: 'Chrome',
		os: 'macOS',
		mobile: false,
		ip: '83.24.x.x',
		createdAt: '2026-11-01T10:00:00.000Z',
		lastUsedAt: minutesAgo(0),
		current: true,
	},
	{
		id: 's2',
		browser: 'Safari',
		os: 'iOS',
		mobile: true,
		ip: '31.0.x.x',
		createdAt: '2026-11-10T10:00:00.000Z',
		lastUsedAt: minutesAgo(180),
		current: false,
	},
]

const renderSecurity = (user = { _id: 'u1', username: 'alice', email: 'a@example.com' }) => {
	restoreSessionAs(user)
	return renderWithProviders(
		<RequireAuth>
			<SecurityPage />
		</RequireAuth>,
		{ path: '/account/security' },
	)
}

describe('SecurityPage', () => {
	beforeEach(() => {
		localStorage.clear()
		vi.mocked(authApi.fetchSessions).mockResolvedValue(sessions)
		vi.mocked(authApi.revokeSession).mockResolvedValue({})
		vi.mocked(authApi.revokeOtherSessions).mockResolvedValue({ revoked: 1 })
	})

	it('lists the devices with this one marked and the IP masked', async () => {
		renderSecurity()
		const items = await screen.findAllByRole('listitem')
		expect(items).toHaveLength(2)

		expect(within(items[0]).getByText('Chrome on macOS')).toBeInTheDocument()
		expect(within(items[0]).getByText('This device')).toBeInTheDocument()
		expect(within(items[0]).getByText('Active now')).toBeInTheDocument()
		// the current device is signed out with the usual "Sign out", not from this list
		expect(within(items[0]).queryByRole('button')).not.toBeInTheDocument()

		expect(within(items[1]).getByText('Safari on iOS')).toBeInTheDocument()
		expect(within(items[1]).getByText('IP 31.0.x.x')).toBeInTheDocument()
		expect(within(items[1]).getByText('Active 3 hours ago')).toBeInTheDocument()
	})

	it('signs out another device after confirming', async () => {
		renderSecurity()
		fireEvent.click(await screen.findByRole('button', { name: 'Sign out Safari on iOS' }))

		const dialog = await screen.findByRole('alertdialog')
		expect(within(dialog).getByText(/Safari on iOS will be signed out/)).toBeInTheDocument()
		fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }))

		expect(await screen.findByText('The device was signed out.')).toBeInTheDocument()
		expect(authApi.revokeSession).toHaveBeenCalledWith('s2')
	})

	it('signs out all other devices', async () => {
		renderSecurity()
		fireEvent.click(await screen.findByRole('button', { name: 'Sign out all other devices' }))
		const dialog = await screen.findByRole('alertdialog')
		fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out all other devices' }))

		expect(await screen.findByText('1 device was signed out.')).toBeInTheDocument()
		expect(authApi.revokeOtherSessions).toHaveBeenCalled()
	})

	it('offers no sign-out actions on a shared demo account', async () => {
		vi.mocked(authApi.fetchSessions).mockResolvedValue([sessions[0]])
		renderSecurity({ _id: 'd1', username: 'demo', email: 'demo@example.com', isDemo: true })

		expect(await screen.findByText('Shared demo account')).toBeInTheDocument()
		expect(await screen.findByText('Chrome on macOS')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
	})
})
