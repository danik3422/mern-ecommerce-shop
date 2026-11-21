import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchInvoice } from '../../api/orders'
import { AuthContext } from '../../auth/AuthContext'
import InvoicePage from './InvoicePage'

vi.mock('../../api/orders', async (importOriginal) => ({
	...(await importOriginal()),
	fetchInvoice: vi.fn(),
}))

const invoice = {
	number: 'FV/2026/11/0007',
	issueDate: '2026-11-16T09:05:00.000Z',
	saleDate: '2026-11-16T09:05:00.000Z',
	placeOfIssue: 'Warszawa',
	currency: 'PLN',
	order: { id: '6a0000000000000000abc123', number: '00ABC123', placedAt: '2026-11-16T09:00:00Z' },
	seller: {
		name: 'Clothe Shop sp. z o.o.',
		street: 'ul. Prosta 20',
		postalCode: '00-850',
		city: 'Warszawa',
		nip: '1234563218',
		bankAccount: '11 1140 2004 0000 3002 1234 5678',
		email: 'hello@example.com',
		phone: '',
	},
	buyer: {
		name: 'Anna Nowak',
		street: 'ul. Marszałkowska 10/4',
		postalCode: '00-590',
		city: 'Warszawa',
		country: 'Polska',
		email: 'anna@example.com',
	},
	payment: { method: 'online', paid: true, paidAt: '2026-11-16T09:05:00.000Z' },
	lines: [
		{
			kind: 'product',
			name: 'Aster Wool Coat',
			color: 'black',
			size: 'M',
			quantity: 2,
			unitPrice: 199.99,
			discount: 20,
			net: 308.93,
			vat: 71.05,
			gross: 379.98,
			vatRate: 23,
		},
		{
			kind: 'shipping',
			name: 'Standard delivery',
			shippingMethodId: 'standard',
			quantity: 1,
			unitPrice: 14.99,
			discount: 0,
			net: 12.19,
			vat: 2.8,
			gross: 14.99,
			vatRate: 23,
		},
	],
	totals: {
		net: 321.12,
		vat: 73.85,
		gross: 394.97,
		byRate: [{ rate: 23, net: 321.12, vat: 73.85, gross: 394.97 }],
	},
}

const renderPage = ({
	path = '/orders/6a0000000000000000abc123/invoice',
	user = { username: 'anna' },
} = {}) =>
	render(
		<QueryClientProvider
			client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
		>
			<AuthContext.Provider value={{ user, isRestoring: false }}>
				<MemoryRouter initialEntries={[path]}>
					<Routes>
						<Route path='/orders/:id/invoice' element={<InvoicePage />} />
					</Routes>
				</MemoryRouter>
			</AuthContext.Provider>
		</QueryClientProvider>,
	)

describe('InvoicePage', () => {
	beforeEach(() => vi.clearAllMocks())

	it('shows the invoice with seller, buyer, lines and consistent totals', async () => {
		vi.mocked(fetchInvoice).mockResolvedValue(invoice)
		renderPage()

		expect(await screen.findByText('FV/2026/11/0007')).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('VAT invoice')
		expect(screen.getByText(/1234563218/)).toBeInTheDocument()
		expect(screen.getByText('ul. Marszałkowska 10/4')).toBeInTheDocument()

		const [lines, summary] = screen.getAllByRole('table')
		const rows = within(lines).getAllByRole('row')
		expect(rows).toHaveLength(3)
		expect(rows[1]).toHaveTextContent('Aster Wool Coat')
		expect(rows[1]).toHaveTextContent('Black, M')
		expect(rows[1]).toHaveTextContent('−20.00')
		expect(rows[1]).toHaveTextContent('308.93')
		expect(rows[2]).toHaveTextContent('Delivery: Standard delivery')

		expect(within(summary).getByRole('row', { name: /Total/ })).toHaveTextContent(
			/321\.12\s*73\.85\s*394\.97/,
		)
		expect(screen.getByTestId('invoice-total')).toHaveTextContent('394.97 PLN')
		expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
	})

	it('prints the page with Download PDF', async () => {
		vi.mocked(fetchInvoice).mockResolvedValue(invoice)
		const print = vi.spyOn(window, 'print').mockImplementation(() => {})
		renderPage()
		;(await screen.findByRole('button', { name: 'Download PDF' })).click()
		expect(print).toHaveBeenCalled()
		print.mockRestore()
	})

	it('sends the guest token from the link', async () => {
		vi.mocked(fetchInvoice).mockResolvedValue(invoice)
		renderPage({ path: '/orders/6a0000000000000000abc123/invoice?token=secret', user: null })
		await screen.findByText('FV/2026/11/0007')
		expect(fetchInvoice).toHaveBeenCalledWith(
			'6a0000000000000000abc123',
			expect.anything(),
			'secret',
		)
	})

	it('explains when the order has no invoice yet', async () => {
		vi.mocked(fetchInvoice).mockImplementation(async () => {
			throw { response: { status: 404, data: {} } }
		})
		renderPage()
		expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
		expect(screen.getByText(/once the order is paid/)).toBeInTheDocument()
	})

	it('asks visitors without a session or token to sign in', () => {
		renderPage({ user: null })
		expect(screen.getByText('Sign in to see your invoice')).toBeInTheDocument()
		expect(fetchInvoice).not.toHaveBeenCalled()
	})
})
