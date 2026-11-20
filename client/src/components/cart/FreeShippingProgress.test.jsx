import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FreeShippingProgress from './FreeShippingProgress'

describe('FreeShippingProgress', () => {
	it('shows how much is missing for free shipping', () => {
		render(<FreeShippingProgress subtotal={38} />)
		expect(screen.getByText(/more for free shipping/)).toHaveTextContent('Add $12.00 more')
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '76')
	})

	it('confirms free shipping from the threshold', () => {
		render(<FreeShippingProgress subtotal={80} />)
		expect(screen.getByText('You get free shipping')).toBeInTheDocument()
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
	})
})
