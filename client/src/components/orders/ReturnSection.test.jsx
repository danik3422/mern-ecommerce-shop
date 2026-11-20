import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ordersApi from '../../api/orders'
import { shopKeys } from '../../api/shop'
import { canRequestReturn } from './returns'
import ReturnSection from './ReturnSection'

vi.mock('../../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	requestReturn: vi.fn(),
}))

const DAY = 24 * 60 * 60 * 1000

const order = (overrides = {}) => ({
	_id: 'o1',
	status: 'delivered',
	deliveredAt: new Date(Date.now() - 2 * DAY).toISOString(),
	items: [
		{
			productId: 'p1',
			color: 'black',
			size: 'M',
			quantity: 2,
			title: 'Coat',
			brand: 'Aster',
			price: 50,
			image: '/c.jpg',
		},
		{
			productId: 'p2',
			color: 'white',
			size: 'S',
			quantity: 1,
			title: 'Tee',
			brand: 'Kiiki',
			price: 20,
			image: '/t.jpg',
		},
	],
	...overrides,
})

const renderSection = (props) => {
	const queryClient = new QueryClient()
	queryClient.setQueryData(shopKeys.config, { currency: 'USD', returnWindowDays: 30 })
	return render(
		<QueryClientProvider client={queryClient}>
			<ReturnSection {...props} />
		</QueryClientProvider>,
	)
}

describe('returns', () => {
	beforeEach(() => vi.mocked(ordersApi.requestReturn).mockReset())

	it('allows returns of delivered orders within the window only', () => {
		const now = new Date()
		expect(canRequestReturn(order(), 30, now)).toBe(true)
		expect(canRequestReturn(order({ status: 'shipped' }), 30, now)).toBe(false)
		expect(canRequestReturn(order({ returnRequest: { status: 'requested' } }), 30, now)).toBe(false)
		expect(canRequestReturn(order({ deliveredAt: new Date(Date.now() - 31 * DAY) }), 30, now)).toBe(
			false,
		)
	})

	it('requests a return of the chosen quantities with a reason and the guest token', async () => {
		const updated = order({ returnRequest: { status: 'requested', items: [] } })
		vi.mocked(ordersApi.requestReturn).mockResolvedValue(updated)
		const onChange = vi.fn()
		renderSection({ order: order(), token: 'secret', onChange })

		fireEvent.click(screen.getByRole('button', { name: /return items/i }))
		const submit = screen.getByRole('button', { name: 'Request return' })
		expect(submit).toBeDisabled()

		fireEvent.change(screen.getByLabelText('Quantity to return of Coat'), {
			target: { value: '1' },
		})
		fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'too_big' } })
		fireEvent.click(submit)

		await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated))
		expect(ordersApi.requestReturn).toHaveBeenCalledWith(
			'o1',
			{
				items: [{ productId: 'p1', color: 'black', size: 'M', quantity: 1 }],
				reason: 'too_big',
				comment: undefined,
			},
			'secret',
		)
	})

	it('shows the state of an existing return with the shop note', () => {
		renderSection({
			order: order({
				returnRequest: { status: 'refunded', refundAmount: 45, note: 'Thanks!' },
			}),
		})
		expect(screen.getByText(/Return completed and refunded/)).toHaveTextContent('$45.00 refunded')
		expect(screen.getByText(/Note from the shop: Thanks!/)).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /return items/i })).not.toBeInTheDocument()
	})
})
