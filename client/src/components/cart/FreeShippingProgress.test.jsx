import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { shopKeys } from '../../api/shop'
import FreeShippingProgress from './FreeShippingProgress'
import { money } from '../../test/money'

const renderProgress = (subtotal) => {
	const queryClient = new QueryClient()
	queryClient.setQueryData(shopKeys.config, { currency: 'USD', freeShippingFrom: 50 })
	return render(
		<QueryClientProvider client={queryClient}>
			<FreeShippingProgress subtotal={subtotal} />
		</QueryClientProvider>,
	)
}

describe('FreeShippingProgress', () => {
	it('shows how much is missing for free shipping', () => {
		renderProgress(38)
		expect(screen.getByText(/more for free shipping/)).toHaveTextContent(`Add ${money(12)} more`)
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '76')
	})

	it('confirms free shipping from the threshold', () => {
		renderProgress(80)
		expect(screen.getByText('You get free shipping')).toBeInTheDocument()
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
	})
})
