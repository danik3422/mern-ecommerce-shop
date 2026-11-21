import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/admin'
import { addDays, shopToday } from '../components/charts/period'
import { renderAdmin } from '../testUtils'
import Analytics from './Analytics'

vi.mock('../../api/admin', async (importOriginal) => ({
	...(await importOriginal()),
	fetchAnalytics: vi.fn(),
}))

const kpi = (kind, value, previous, change) => ({ kind, value, previous, change })

const days = (from, count, values = []) =>
	Array.from({ length: count }, (_, i) => {
		const day = addDays(from, i)
		return { from: day, to: day, revenue: values[i] ?? 0, orders: values[i] ? 1 : 0, placed: 0 }
	})

/** A report shaped like GET /admin/analytics; `empty` gives a period without orders. */
const report = ({ empty = false } = {}) => ({
	period: {
		from: '2026-03-01',
		to: '2026-03-10',
		days: 10,
		timeZone: 'Europe/Warsaw',
		previous: { from: '2026-02-19', to: '2026-02-28' },
	},
	kpis: {
		revenue: kpi('money', empty ? 0 : 375, 200, empty ? -1 : 0.875),
		orders: kpi('count', empty ? 0 : 4, 2, empty ? -1 : 1),
		averageOrderValue: kpi('money', empty ? 0 : 106.25, 100, 0.0625),
		unitsSold: kpi('count', empty ? 0 : 7, 2, 2.5),
		newCustomers: kpi('count', 2, 0, null),
		returningCustomerRate: kpi('rate', 0.6667, 0, 0.6667),
		returnRate: kpi('rate', 0.25, 0, 0.25),
		cancelledRate: kpi('rate', 0.1667, 0.2, -0.0333),
	},
	funnel: [
		{ id: 'carts', label: 'Carts', count: empty ? 0 : 7, fromPrevious: null, fromFirst: 1 },
		{
			id: 'placed',
			label: 'Orders placed',
			count: empty ? 0 : 6,
			fromPrevious: 0.8571,
			fromFirst: 0.8571,
		},
		{
			id: 'paid',
			label: 'Orders paid',
			count: empty ? 0 : 4,
			fromPrevious: 0.6667,
			fromFirst: 0.5714,
		},
		{
			id: 'delivered',
			label: 'Delivered',
			count: empty ? 0 : 1,
			fromPrevious: 0.25,
			fromFirst: 0.1429,
		},
	],
	series: {
		interval: 'day',
		current: days('2026-03-01', 10, empty ? [] : [50, 165, 45, 0, 115]),
		previous: days('2026-02-19', 10, empty ? [] : [0, 100]),
	},
	products: {
		totals: { units: 7, revenue: 400 },
		byRevenue: empty
			? []
			: [
					{ productId: 'p1', title: 'Jeans', brand: 'Acme', units: 5, revenue: 300, share: 0.75 },
					{ productId: 'p2', title: 'Tee', brand: 'Basic', units: 2, revenue: 100, share: 0.25 },
				],
		byUnits: empty
			? []
			: [
					{ productId: 'p1', title: 'Jeans', brand: 'Acme', units: 5, revenue: 300, share: 0.7143 },
					{ productId: 'p2', title: 'Tee', brand: 'Basic', units: 2, revenue: 100, share: 0.2857 },
				],
		brands: empty ? [] : [{ name: 'Acme', units: 5, revenue: 300, share: 0.75 }],
		categories: empty ? [] : [{ name: 'jeans', units: 5, revenue: 300, share: 0.75 }],
		sizes: empty
			? []
			: [
					{ size: 'M', units: 5, share: 0.7143 },
					{ size: 'S', units: 2, share: 0.2857 },
				],
	},
	returns: {
		count: empty ? 0 : 1,
		rate: empty ? 0 : 0.25,
		refunded: empty ? 0 : 50,
		byStatus: {},
		reasons: empty ? [] : [{ reason: 'too_small', count: 1, share: 1 }],
		minSample: 5,
		products: empty
			? []
			: [{ productId: 'p1', title: 'Jeans', brand: 'Acme', sold: 5, returned: 1, rate: 0.2 }],
	},
	delivery: empty ? [] : [{ name: 'Courier', orders: 2, share: 0.5, shipping: 30 }],
	promoCodes: { orders: 0, share: 0, discount: 0, codes: [] },
	statuses: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((name) => ({
		name,
		orders: empty ? 0 : 1,
		share: empty ? 0 : 0.2,
	})),
})

const lastCall = () => api.fetchAnalytics.mock.calls.at(-1)[0]

beforeEach(() => {
	vi.clearAllMocks()
	api.fetchAnalytics.mockResolvedValue(report())
})

describe('Analytics', () => {
	it('shows KPIs with their change, the funnel, top products and returns', async () => {
		renderAdmin(<Analytics />, { path: '/admin/analytics' })
		expect(screen.getByLabelText('Loading analytics')).toBeInTheDocument()

		const revenue = (await screen.findByText('Revenue', { selector: 'p' })).parentElement
		expect(revenue).toHaveTextContent(/375\.00/)
		expect(revenue).toHaveTextContent('Up 87.5%')
		// a lower cancelled rate is good news, shown in points
		const cancelled = screen.getByText('Cancelled', { selector: 'p' }).parentElement
		expect(cancelled).toHaveTextContent('Down 3.3 pts')
		expect(screen.getByText('New customers').parentElement).toHaveTextContent('New')

		const funnel = screen.getByRole('list', { name: 'Conversion funnel' })
		expect(within(funnel).getAllByRole('listitem')).toHaveLength(4)
		expect(funnel).toHaveTextContent('85.7% of the previous step')

		const products = screen.getByRole('region', { name: 'Top products' })
		expect(within(products).getAllByRole('row')).toHaveLength(3)
		expect(within(products).getByRole('link', { name: 'Jeans' })).toHaveAttribute(
			'href',
			'/admin/products/p1',
		)
		fireEvent.click(within(products).getByRole('button', { name: 'By units' }))
		expect(products).toHaveTextContent('71.4%')

		expect(screen.getByRole('list', { name: 'Return reasons' })).toHaveTextContent('Too small')
		// the chart's numbers are available as a table
		expect(screen.getByRole('table', { name: /Revenue per day/ })).toBeInTheDocument()
	})

	it('loads the last 30 days by default and switches periods through the URL', async () => {
		renderAdmin(<Analytics />, { path: '/admin/analytics' })
		await screen.findByRole('region', { name: 'Top products' })
		const today = shopToday()
		expect(lastCall()).toEqual({ from: addDays(today, -29), to: today, compare: 'previous' })

		fireEvent.click(screen.getByRole('button', { name: '7 days' }))
		await waitFor(() => expect(lastCall()).toMatchObject({ from: addDays(today, -6), to: today }))
		expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')

		fireEvent.click(screen.getByRole('checkbox', { name: 'Compare with previous period' }))
		await waitFor(() => expect(lastCall()).toMatchObject({ compare: 'none' }))
	})

	it('applies a custom range', async () => {
		renderAdmin(<Analytics />, {
			path: '/admin/analytics?period=custom&from=2026-03-01&to=2026-03-10',
			route: '/admin/analytics',
		})
		await screen.findByRole('region', { name: 'Top products' })
		expect(lastCall()).toEqual({ from: '2026-03-01', to: '2026-03-10', compare: 'previous' })

		fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-03-20' } })
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
		expect(screen.getByRole('alert')).toHaveTextContent('The start must be before the end')

		fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } })
		fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
		await waitFor(() => expect(lastCall()).toMatchObject({ from: '2026-02-01', to: '2026-03-10' }))
	})

	it('explains an empty period', async () => {
		api.fetchAnalytics.mockResolvedValue(report({ empty: true }))
		renderAdmin(<Analytics />, { path: '/admin/analytics' })
		expect(await screen.findByText(/No orders were placed/)).toBeInTheDocument()
		expect(screen.getByText('No products were sold in this period.')).toBeInTheDocument()
		expect(screen.getByText('No returns in this period.')).toBeInTheDocument()
		expect(screen.getByText('No sales in this period')).toBeInTheDocument()
	})
})
