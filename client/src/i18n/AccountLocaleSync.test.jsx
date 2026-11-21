import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../api/account'
import { useAuth } from '../auth/useAuth'
import AccountLocaleSync from './AccountLocaleSync'
import { I18nProvider } from './I18nProvider'

vi.mock('../api/account', async (importOriginal) => ({
	...(await importOriginal()),
	updateProfile: vi.fn(),
}))
vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../api/shop', async (importOriginal) => ({
	...(await importOriginal()),
	fetchShopConfig: vi.fn(() => new Promise(() => {})),
}))

const renderSync = () =>
	render(
		<QueryClientProvider client={new QueryClient()}>
			<I18nProvider>
				<AccountLocaleSync />
			</I18nProvider>
		</QueryClientProvider>,
	)

describe('AccountLocaleSync', () => {
	const updateUser = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.setItem('locale', JSON.stringify('pl'))
		vi.mocked(accountApi.updateProfile).mockResolvedValue({ _id: 'u1', locale: 'pl' })
	})

	it('saves the shop language on the account of a signed-in customer', async () => {
		vi.mocked(useAuth).mockReturnValue({ user: { _id: 'u1', locale: 'en' }, updateUser })
		renderSync()
		await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ _id: 'u1', locale: 'pl' }))
		expect(accountApi.updateProfile).toHaveBeenCalledWith({ locale: 'pl' })
	})

	it('does nothing for guests or when the language already matches', () => {
		vi.mocked(useAuth).mockReturnValue({ user: null, updateUser })
		renderSync()
		vi.mocked(useAuth).mockReturnValue({ user: { _id: 'u1', locale: 'pl' }, updateUser })
		renderSync()
		expect(accountApi.updateProfile).not.toHaveBeenCalled()
	})
})
