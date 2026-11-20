import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as accountApi from '../../api/account'
import { renderWithProviders } from './test-utils'
import WishlistButton from './WishlistButton'

vi.mock('../../api/account')

describe('WishlistButton for guests', () => {
	it('sends guests to sign in without calling the API', async () => {
		renderWithProviders(<WishlistButton productId='p1' />, { path: '/product/coat' })

		fireEvent.click(screen.getByRole('button', { name: 'Add to wishlist' }))

		expect(await screen.findByRole('heading', { name: 'Sign in page' })).toBeInTheDocument()
		expect(accountApi.fetchWishlistIds).not.toHaveBeenCalled()
		expect(accountApi.addToWishlist).not.toHaveBeenCalled()
	})
})
