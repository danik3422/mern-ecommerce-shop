import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reviewsApi from '../../api/reviews'
import { renderWithProviders } from '../account/test-utils'
import ProductReviews from './ProductReviews'
import { restoreSessionAs } from '../../test/session'

// AuthProvider restores this session from the (faked) refresh cookie when it mounts
restoreSessionAs({ _id: 'u1', username: 'alice', email: 'alice@example.com', isAdmin: false })
vi.mock('../../api/reviews', async (importOriginal) => ({
	...(await importOriginal()),
	fetchReviews: vi.fn(),
	fetchReviewEligibility: vi.fn(),
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
			fit: 'small',
			sizeBought: 'M',
			createdAt: '2026-10-01T10:00:00.000Z',
		},
	],
	page: 1,
	pages: 1,
	total: 2,
	summary: { average: 4, count: 2, distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 } },
}

describe('ProductReviews', () => {
	beforeEach(() => {
		vi.mocked(reviewsApi.fetchReviews).mockResolvedValue(reviewsPage)
		vi.mocked(reviewsApi.createReview).mockResolvedValue({ _id: 'r3' })
		vi.mocked(reviewsApi.fetchReviewEligibility).mockResolvedValue({
			canReview: true,
			reason: null,
		})
	})

	it('shows the summary, distribution and reviews', async () => {
		renderWithProviders(<ProductReviews product={product} />)

		expect(await screen.findByRole('heading', { name: 'Reviews (2)' })).toBeInTheDocument()
		expect(screen.getByText('4.0')).toBeInTheDocument()
		const distribution = screen.getByRole('list', { name: 'Rating distribution' })
		expect(within(distribution).getAllByRole('listitem')).toHaveLength(5)
		expect(screen.getByText('Warm and well made.')).toBeInTheDocument()
		expect(screen.getByRole('img', { name: 'Rated 3 out of 5' })).toBeInTheDocument()
		// fit feedback of the review that has it
		expect(screen.getByText('Size bought: M')).toBeInTheDocument()
		expect(screen.getByText('Runs small')).toBeInTheDocument()
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

	it('asks how it fits and which size was bought for products with sizes', async () => {
		const sized = {
			...product,
			variants: [
				{ color: 'black', sizes: [{ label: 'S' }, { label: 'M' }] },
				{ color: 'beige', sizes: [{ label: 'M' }, { label: 'L' }] },
			],
		}
		renderWithProviders(<ProductReviews product={sized} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }))

		const fit = screen.getByRole('group', { name: /How does it fit\?/ })
		expect(
			within(fit)
				.getAllByRole('radio')
				.map((radio) => radio.labels[0].textContent),
		).toEqual(['Runs small', 'True to size', 'Runs large'])
		const size = screen.getByLabelText(/Size you bought/)
		expect(
			within(size)
				.getAllByRole('option')
				.map((option) => option.value),
		).toEqual(['', 'S', 'M', 'L'])

		fireEvent.click(screen.getByRole('radio', { name: /^5 stars/ }))
		fireEvent.click(within(fit).getByRole('radio', { name: 'Runs large' }))
		fireEvent.change(size, { target: { value: 'L' } })
		fireEvent.change(screen.getByLabelText('Your review'), {
			target: { value: 'Roomy, size down.' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Post review' }))

		await waitFor(() =>
			expect(reviewsApi.createReview).toHaveBeenCalledWith('p1', {
				rating: 5,
				body: 'Roomy, size down.',
				fit: 'large',
				sizeBought: 'L',
			}),
		)
	})

	it('does not ask about the fit of one-size products', async () => {
		const cap = { ...product, variants: [{ color: 'black', sizes: [{ label: 'One size' }] }] }
		renderWithProviders(<ProductReviews product={cap} />)
		fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }))
		expect(screen.queryByRole('group', { name: /How does it fit/ })).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/Size you bought/)).not.toBeInTheDocument()
	})

	it.each([
		['not_purchased', 'Only customers who bought this item can review it.'],
		['already_reviewed', 'You have already reviewed this item.'],
	])('hides the form and explains why (%s)', async (reason, text) => {
		vi.mocked(reviewsApi.fetchReviewEligibility).mockResolvedValue({ canReview: false, reason })
		renderWithProviders(<ProductReviews product={product} />)

		expect(await screen.findByText(text)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument()
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
