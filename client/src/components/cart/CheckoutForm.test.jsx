import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../../api/account'
import * as ordersApi from '../../api/orders'
import CheckoutForm from './CheckoutForm'

vi.mock('../../api/account', async (importOriginal) => ({
	...(await importOriginal()),
	fetchAddresses: vi.fn(),
	createAddress: vi.fn(),
}))
vi.mock('../../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	createOrder: vi.fn(),
}))

const lines = [{ productId: 'p1', quantity: 1, size: 'M', color: 'black' }]
const home = {
	_id: 'a1',
	fullName: 'Alice Smith',
	street: 'Main st. 1',
	city: 'Warsaw',
	postalCode: '00-001',
	country: 'Poland',
	isDefault: false,
}
const office = { ...home, _id: 'a2', street: 'Office ave. 5', isDefault: true }
const placed = { order: { _id: 'o1' }, checkoutUrl: null }

const renderForm = (props = {}) => {
	const onOrderPlaced = vi.fn()
	render(
		<QueryClientProvider client={new QueryClient()}>
			<CheckoutForm lines={lines} onOrderPlaced={onOrderPlaced} {...props} />
		</QueryClientProvider>,
	)
	return { onOrderPlaced }
}

const placeOrder = () => fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

const typeAddress = () => {
	const values = {
		'Full name': 'Bob Brown',
		'Street and house number': 'Long road 7',
		'Postal code': '10-100',
		City: 'Gdansk',
		Country: 'Poland',
	}
	for (const [label, value] of Object.entries(values)) {
		fireEvent.change(screen.getByLabelText(label), { target: { value } })
	}
}

describe('CheckoutForm', () => {
	beforeEach(() => {
		vi.mocked(ordersApi.createOrder).mockResolvedValue(placed)
		vi.mocked(accountApi.createAddress).mockResolvedValue({})
	})

	it('preselects the default saved address and orders with it', async () => {
		vi.mocked(accountApi.fetchAddresses).mockResolvedValue([home, office])
		const { onOrderPlaced } = renderForm()

		expect(await screen.findByRole('radio', { name: /office ave/i })).toBeChecked()
		expect(screen.queryByLabelText('City')).not.toBeInTheDocument()

		placeOrder()

		await waitFor(() => expect(onOrderPlaced).toHaveBeenCalledWith(placed))
		const { _id, isDefault, ...address } = office
		expect(ordersApi.createOrder).toHaveBeenCalledWith({ items: lines, address })
		expect(accountApi.createAddress).not.toHaveBeenCalled()
	})

	it('lets the customer switch to a new address and saves it', async () => {
		vi.mocked(accountApi.fetchAddresses).mockResolvedValue([home])
		renderForm()

		fireEvent.click(await screen.findByRole('radio', { name: /use a new address/i }))
		typeAddress()
		placeOrder()

		await waitFor(() => expect(accountApi.createAddress).toHaveBeenCalled())
		expect(ordersApi.createOrder.mock.calls[0][0].address).toMatchObject({ city: 'Gdansk' })
	})

	it('falls back to a new address when the address book is unavailable', async () => {
		vi.mocked(accountApi.fetchAddresses).mockRejectedValue({ response: { status: 404 } })
		const { onOrderPlaced } = renderForm()

		expect(await screen.findByLabelText('City')).toBeInTheDocument()
		typeAddress()
		fireEvent.click(screen.getByLabelText('Save to my addresses'))
		placeOrder()

		await waitFor(() => expect(onOrderPlaced).toHaveBeenCalled())
		expect(accountApi.createAddress).not.toHaveBeenCalled()
	})

	it('shows server validation errors next to the fields', async () => {
		vi.mocked(accountApi.fetchAddresses).mockResolvedValue([])
		vi.mocked(ordersApi.createOrder).mockRejectedValue({
			response: {
				status: 400,
				data: {
					message: 'Validation failed',
					details: [{ path: 'address.postalCode', message: 'Too short' }],
				},
			},
		})
		renderForm()

		await screen.findByLabelText('City')
		typeAddress()
		placeOrder()

		expect(await screen.findByText('Too short')).toBeInTheDocument()
		expect(screen.getByLabelText('Postal code')).toHaveAttribute('aria-invalid', 'true')
	})

	it('cannot be submitted while items are not available', async () => {
		vi.mocked(accountApi.fetchAddresses).mockResolvedValue([office])
		renderForm({ disabled: true })
		await screen.findByRole('radio', { name: /office ave/i })
		expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
	})
})
