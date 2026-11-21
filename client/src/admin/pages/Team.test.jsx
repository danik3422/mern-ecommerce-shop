import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/admin'
import { OWNER, renderAdmin } from '../testUtils'
import Team from './Team'

vi.mock('../../api/admin', async (importOriginal) => ({
	...(await importOriginal()),
	fetchTeam: vi.fn(),
	createStaff: vi.fn(),
	updateStaff: vi.fn(),
	deleteStaff: vi.fn(),
}))

const member = (overrides) => ({
	_id: 'x',
	username: 'x',
	email: 'x@example.com',
	isOwner: false,
	permissions: [],
	blocked: false,
	lastLoginAt: null,
	...overrides,
})

beforeEach(() => {
	vi.clearAllMocks()
	api.fetchTeam.mockResolvedValue({
		staff: [
			member({ _id: OWNER._id, username: 'boss', isOwner: true }),
			member({ _id: 's1', username: 'sam', permissions: ['dashboard', 'products'] }),
		],
	})
})

describe('Team', () => {
	it('lists staff with their role and keeps owners from removing themselves', async () => {
		renderAdmin(<Team />, { path: '/admin/team' })
		const sam = (await screen.findByText('sam')).closest('tr')
		expect(sam).toHaveTextContent('Content / Warehouse')
		expect(within(sam).getByRole('button', { name: 'Remove sam' })).toBeInTheDocument()

		const me = screen.getByText('boss').closest('tr')
		expect(me).toHaveTextContent('(you)')
		expect(within(me).queryByRole('button', { name: /Remove|Deactivate/ })).not.toBeInTheDocument()
	})

	it('creates a staff member from a preset', async () => {
		api.createStaff.mockImplementation(async (body) => ({ _id: 'n1', ...body }))
		renderAdmin(<Team />, { path: '/admin/team' })
		fireEvent.click(await screen.findByRole('button', { name: 'Add staff member' }))

		const drawer = await screen.findByRole('dialog', { name: 'Add staff member' })
		fireEvent.change(within(drawer).getByLabelText('Username'), { target: { value: 'ola' } })
		fireEvent.change(within(drawer).getByLabelText('Email'), {
			target: { value: 'ola@example.com' },
		})
		const password = within(drawer).getByLabelText('Temporary password')
		expect(password.value).toHaveLength(12)
		fireEvent.change(password, { target: { value: 'temporary-123' } })

		fireEvent.click(within(drawer).getByRole('button', { name: 'Manager' }))
		expect(within(drawer).getByRole('checkbox', { name: /Team/ })).not.toBeChecked()
		fireEvent.click(within(drawer).getByRole('button', { name: 'Support' }))
		expect(within(drawer).getByRole('checkbox', { name: /Orders/ })).toBeChecked()
		expect(within(drawer).getByRole('checkbox', { name: /Products/ })).not.toBeChecked()

		fireEvent.click(within(drawer).getByRole('button', { name: 'Create account' }))
		await waitFor(() =>
			expect(api.createStaff).toHaveBeenCalledWith({
				username: 'ola',
				email: 'ola@example.com',
				password: 'temporary-123',
				permissions: ['orders', 'returns', 'customers', 'reviews'],
				isOwner: false,
			}),
		)
		expect(await screen.findByText('ola can sign in now')).toBeInTheDocument()
	})
})
