import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as productsApi from '../../api/products'
import { AuthProvider } from '../../auth/AuthProvider'
import NotifyMe from './NotifyMe'

vi.mock('../../api/products', async (importOriginal) => ({
	...(await importOriginal()),
	createStockAlert: vi.fn(),
}))

const coat = {
	_id: 'p1',
	brand: 'Aster',
	title: 'Coat',
	sizes: [
		{ label: 'S', stock: 2 },
		{ label: 'M', stock: 0 },
		{ label: 'L', stock: 0 },
	],
}

const renderNotifyMe = (product = coat) =>
	render(
		<QueryClientProvider client={new QueryClient()}>
			<AuthProvider>
				<NotifyMe product={product} />
			</AuthProvider>
		</QueryClientProvider>,
	)

describe('NotifyMe', () => {
	beforeEach(() => localStorage.clear())

	it('subscribes an email to a sold-out size', async () => {
		vi.mocked(productsApi.createStockAlert).mockResolvedValue({
			message: 'We will email anna@example.com when size L is back in stock',
		})
		renderNotifyMe()
		fireEvent.click(screen.getByRole('button', { name: /get notified/i }))

		// only sold-out sizes can be chosen
		const size = screen.getByLabelText('Size')
		expect([...size.options].map((o) => o.value)).toEqual(['M', 'L'])
		fireEvent.change(size, { target: { value: 'L' } })
		fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'anna@example.com' } })
		fireEvent.click(screen.getByRole('button', { name: 'Notify me' }))

		expect(await screen.findByText(/when size L is back/)).toBeInTheDocument()
		expect(productsApi.createStockAlert).toHaveBeenCalledWith('p1', {
			size: 'L',
			email: 'anna@example.com',
		})
	})

	it('renders nothing when every size is in stock', () => {
		const { container } = renderNotifyMe({ ...coat, sizes: [{ label: 'S', stock: 1 }] })
		expect(container).toBeEmptyDOMElement()
	})
})
