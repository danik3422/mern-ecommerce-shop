import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../../api/account'
import { renderWithProviders } from './test-utils'
import WishlistButton from './WishlistButton'
import { restoreSessionAs } from '../../test/session'

// AuthProvider restores this session from the (faked) refresh cookie when it mounts
restoreSessionAs({ _id: 'u1', username: 'alice', email: 'alice@example.com', isAdmin: false })
vi.mock('../../api/account', async (importOriginal) => ({
	...(await importOriginal()),
	fetchWishlistIds: vi.fn(),
	addToWishlist: vi.fn(),
	removeFromWishlist: vi.fn(),
}))

describe('WishlistButton for signed-in users', () => {
	beforeEach(() => {
		vi.mocked(accountApi.fetchWishlistIds).mockResolvedValue(['other'])
		vi.mocked(accountApi.addToWishlist).mockResolvedValue(['other', 'p1'])
		vi.mocked(accountApi.removeFromWishlist).mockResolvedValue(['other'])
	})

	it('adds and removes the product', async () => {
		renderWithProviders(<WishlistButton productId='p1' />)
		await waitFor(() => expect(accountApi.fetchWishlistIds).toHaveBeenCalled())

		fireEvent.click(screen.getByRole('button', { name: 'Add to wishlist' }))
		const saved = await screen.findByRole('button', { name: 'Remove from wishlist' })
		expect(saved).toHaveAttribute('aria-pressed', 'true')
		expect(accountApi.addToWishlist).toHaveBeenCalledWith('p1')

		fireEvent.click(saved)
		expect(await screen.findByRole('button', { name: 'Add to wishlist' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
		expect(accountApi.removeFromWishlist).toHaveBeenCalledWith('p1')
	})

	it('rolls back when saving fails', async () => {
		vi.mocked(accountApi.addToWishlist).mockRejectedValue(new Error('Network error'))
		renderWithProviders(<WishlistButton productId='p1' variant='button' />)
		await waitFor(() => expect(accountApi.fetchWishlistIds).toHaveBeenCalled())

		fireEvent.click(screen.getByRole('button', { name: 'Add to wishlist' }))

		await waitFor(() => expect(accountApi.addToWishlist).toHaveBeenCalled())
		expect(await screen.findByRole('button', { name: 'Add to wishlist' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
	})
})
