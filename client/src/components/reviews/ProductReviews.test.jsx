import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reviewsApi from '../../api/reviews'
import { renderWithProviders } from '../account/test-utils'
import ProductReviews from './ProductReviews'

// AuthProvider reads the session once at import time, so it must be stored first
vi.hoisted(() => {
	const user = { _id: 'u1', username: 'alice', email: 'alice@example.com', isAdmin: false }
	localStorage.setItem('session', JSON.stringify({ user, accessToken: 'token' }))
})
vi.mock('../../api/reviews', async (importOriginal) => ({
	...(await importOriginal()),
	fetchReviews: vi.fn(),
	createReview: vi.fn(),
	deleteReview: vi.fn(),
}))

const product = { _id: 'p1', title: 'Coat' }

const reviewsPage = {
	items: [
		{
			_id: 'r1',
			user: 'u1',
			username: 'alice',
			rating: 5,
			title: 'Love it',
			body: 'Warm and well made.',
			createdAt: '2026-11-01T10:00:00.000Z',
		},
		{
			_id: 'r2',
			user: 'u2',
			username: 'bob',
			rating: 3,
			body: 'Runs a bit small.',
			createdAt: '2026-10-01T10:00:00.000Z',
		},
	],
	page: 1,
	pages: 1,
	total: 2,
	summary: { average: 4, count: 2, distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 } },
}

const forbidden = Object.assign(new Error('Request failed'), {
	response: {
		status: 403,
		data: { message: 'Only customers who ordered this product can review it' },
	},
})

describe('ProductReviews', () => {
	beforeEach(() => {
		vi.mocked(reviewsApi.fetchReviews).mockResolvedValue(reviewsPage)
		vi.mocked(reviewsApi.createReview).mockResolvedValue({ _id: 'r3' })
	})

	it('shows the summary, distribution and reviews', async () => {
		renderWithProviders(<ProductReviews product={product} />)

		expect(await screen.findByRole('heading', { name: 'Reviews (2)' })).toBeInTheDocument()
		expect(screen.getByText('4.0')).toBeInTheDocument()
		const distribution = screen.getByRole('list', { name: 'Rating distribution' })
		expect(within(distribution).getAllByRole('listitem')).toHaveLength(5)
		expect(screen.getByText('Warm and well made.')).toBeInTheDocument()
		expect(screen.getByRole('img', { name: 'Rated 3 out of 5' })).toBeInTheDocument()
		// only the author (alice) can delete her review
		expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1)
	})

	it('requires a rating and posts the review', async () => {
		renderWithProviders(<ProductReviews product={product} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }))

		fireEvent.change(screen.getByLabelText('Your review'), {
			target: { value: 'Great quality, true to size.' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Post review' }))
		expect(await screen.findByText('Choose a rating from 1 to 5')).toBeInTheDocument()
		expect(reviewsApi.createReview).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('radio', { name: /^4 stars/ }))
		fireEvent.click(screen.getByRole('button', { name: 'Post review' }))

		await waitFor(() =>
			expect(reviewsApi.createReview).toHaveBeenCalledWith('p1', {
				rating: 4,
				body: 'Great quality, true to size.',
			}),
		)
		await waitFor(() =>
			expect(screen.queryByRole('form', { name: 'Write a review' })).not.toBeInTheDocument(),
		)
	})

	it('explains when only buyers can review', async () => {
		vi.mocked(reviewsApi.createReview).mockRejectedValue(forbidden)
		renderWithProviders(<ProductReviews product={product} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }))

		fireEvent.click(screen.getByRole('radio', { name: /^5 stars/ }))
		fireEvent.change(screen.getByLabelText('Your review'), {
			target: { value: 'I like it a lot, honestly.' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Post review' }))

		expect(
			await screen.findByText('Only customers who ordered this product can review it'),
		).toBeInTheDocument()
	})

	it('invites to write the first review', async () => {
		vi.mocked(reviewsApi.fetchReviews).mockResolvedValue({
			items: [],
			page: 1,
			pages: 0,
			total: 0,
			summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
		})
		renderWithProviders(<ProductReviews product={product} />)
		expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument()
	})
})
