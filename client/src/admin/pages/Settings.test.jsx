import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchShopSettings, updateShopSettings } from '../../api/admin'
import Settings from './Settings'

vi.mock('../../api/admin', async (importOriginal) => ({
	...(await importOriginal()),
	fetchShopSettings: vi.fn(),
	updateShopSettings: vi.fn(),
}))

const method = (id, en, price, days, extra = {}) => ({
	id,
	label: { en, pl: `${en} PL` },
	price,
	freeShipping: true,
	days,
	enabled: true,
	...extra,
})

const settings = {
	currency: 'PLN',
	shopName: 'Clothe Shop',
	contactEmail: 'hello@example.com',
	contactPhone: '',
	announcement: { en: 'Winter sale', pl: '' },
	freeShippingFrom: 200,
	returnWindowDays: 30,
	lowStockThreshold: 3,
	shippingMethods: [
		method('standard', 'Standard delivery', 14.99, [3, 5]),
		method('locker', 'Parcel locker', 9.99, [2, 3]),
		method('express', 'Express delivery', 29.99, [1, 2], { freeShipping: false }),
	],
}

const renderSettings = () =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<Settings />
		</QueryClientProvider>,
	)

const change = (element, value) => fireEvent.change(element, { target: { value } })

describe('Settings page', () => {
	beforeEach(() => {
		vi.mocked(fetchShopSettings).mockResolvedValue(settings)
		vi.mocked(updateShopSettings).mockReset()
	})

	it('shows the saved settings', async () => {
		renderSettings()

		expect(await screen.findByLabelText('Shop name')).toHaveValue('Clothe Shop')
		expect(screen.getByLabelText('Contact email')).toHaveValue('hello@example.com')
		expect(screen.getByLabelText('English')).toHaveValue('Winter sale')
		expect(screen.getByLabelText('Free shipping from (PLN)')).toHaveValue(200)
		expect(screen.getByLabelText('Return window (days)')).toHaveValue(30)
		expect(screen.getByLabelText('Low stock threshold')).toHaveValue(3)
		expect(screen.getByLabelText('Express: price in PLN')).toHaveValue(29.99)
		expect(screen.getByLabelText('Express: free over the threshold')).not.toBeChecked()
		expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
	})

	it('saves changes and reports success', async () => {
		vi.mocked(updateShopSettings).mockImplementation(async (body) => ({
			...body,
			currency: 'PLN',
		}))
		renderSettings()

		change(await screen.findByLabelText('Free shipping from (PLN)'), '250')
		change(screen.getByLabelText('Parcel locker: price in PLN'), '11.5')
		fireEvent.click(screen.getByLabelText('Express: enabled'))
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

		expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
		const body = vi.mocked(updateShopSettings).mock.calls[0][0]
		expect(body).toMatchObject({ freeShippingFrom: 250, returnWindowDays: 30 })
		expect(body).not.toHaveProperty('currency')
		expect(body.shippingMethods[1]).toMatchObject({ id: 'locker', price: 11.5 })
		expect(body.shippingMethods[2]).toMatchObject({ id: 'express', enabled: false })
		expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
	})

	it('shows server validation errors next to their fields', async () => {
		vi.mocked(updateShopSettings).mockRejectedValue({
			response: {
				status: 400,
				data: {
					message: 'Validation failed',
					details: [
						{ path: 'shippingMethods.0.days.1', message: 'Must not be less than the minimum' },
					],
				},
			},
		})
		renderSettings()

		change(await screen.findByLabelText('Standard: at most (days)'), '1')
		fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('fix the highlighted fields')
		const input = screen.getByLabelText('Standard: at most (days)')
		expect(input).toHaveAttribute('aria-invalid', 'true')
		expect(within(input.parentElement).getByText('Must not be less than the minimum')).toBeVisible()
	})
})
