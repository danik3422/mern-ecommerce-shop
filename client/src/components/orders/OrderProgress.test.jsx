import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import OrderProgress from './OrderProgress'
import { buildTimeline } from './timeline'

const PLACED = '2026-11-16T09:00:00.000Z'
const PAID = '2026-11-16T09:05:00.000Z'
const SHIPPED = '2026-11-17T12:00:00.000Z'
const DELIVERED = '2026-11-19T15:30:00.000Z'

const makeOrder = (overrides = {}) => ({
	_id: '6a0000000000000000abc123',
	createdAt: PLACED,
	status: 'pending',
	payment: { provider: 'stripe' },
	statusHistory: [{ status: 'pending', at: PLACED }],
	...overrides,
})

const shippedOrder = (overrides = {}) =>
	makeOrder({
		status: 'shipped',
		payment: { provider: 'stripe', paidAt: PAID },
		shippedAt: SHIPPED,
		statusHistory: [
			{ status: 'pending', at: PLACED },
			{ status: 'paid', at: PAID },
			{ status: 'shipped', at: SHIPPED },
		],
		tracking: {
			carrier: 'inpost',
			number: '620000111222333444555666',
			url: 'https://inpost.pl/sledzenie-przesylek?number=620000111222333444555666',
		},
		estimatedDelivery: { from: '2026-11-18', to: '2026-11-19' },
		...overrides,
	})

const renderProgress = (order, token) =>
	render(
		<MemoryRouter>
			<OrderProgress order={order} token={token} />
		</MemoryRouter>,
	)

const steps = () => within(screen.getByRole('list')).getAllByRole('listitem')
const currentStep = () => steps().find((step) => step.getAttribute('aria-current') === 'step')

describe('buildTimeline', () => {
	it('marks the latest step reached as current and the rest as upcoming', () => {
		expect(buildTimeline(makeOrder()).map(({ key, state }) => [key, state])).toEqual([
			['placed', 'current'],
			['paid', 'upcoming'],
			['shipped', 'upcoming'],
			['delivered', 'upcoming'],
		])
		expect(buildTimeline(shippedOrder()).map(({ key, state }) => [key, state])).toEqual([
			['placed', 'done'],
			['paid', 'done'],
			['shipped', 'current'],
			['delivered', 'upcoming'],
		])
	})

	it('shows payment on delivery for orders without online payment', () => {
		const keys = buildTimeline(makeOrder({ payment: { provider: 'none' } })).map((s) => s.key)
		expect(keys).toContain('payOnDelivery')
	})

	it('ends with the cancellation, and with return events after delivery', () => {
		const cancelled = makeOrder({
			status: 'cancelled',
			statusHistory: [
				{ status: 'pending', at: PLACED },
				{ status: 'cancelled', at: PAID },
			],
		})
		expect(buildTimeline(cancelled).map(({ key, state }) => [key, state])).toEqual([
			['placed', 'done'],
			['cancelled', 'current'],
		])

		const returned = shippedOrder({
			status: 'delivered',
			deliveredAt: DELIVERED,
			returnRequest: {
				status: 'refunded',
				requestedAt: '2026-11-20T10:00:00.000Z',
				decidedAt: '2026-11-21T10:00:00.000Z',
				refundedAt: '2026-11-24T10:00:00.000Z',
			},
		})
		const timeline = buildTimeline(returned)
		expect(timeline.map((step) => step.key).slice(-3)).toEqual([
			'returnRequested',
			'returnApproved',
			'returnRefunded',
		])
		expect(timeline.at(-1).state).toBe('current')
		// older orders without status history use the delivery date
		expect(timeline.find((step) => step.key === 'delivered').at).toBe(DELIVERED)
	})
})

describe('OrderProgress', () => {
	it('shows a new unpaid order with the next steps still to come', () => {
		renderProgress(makeOrder())

		expect(steps()).toHaveLength(4)
		expect(currentStep()).toHaveTextContent('Order placed')
		expect(currentStep()).toHaveTextContent('We have received your order.')
		expect(screen.queryByText('Estimated delivery')).not.toBeInTheDocument()
		expect(screen.queryByRole('link', { name: /invoice/i })).not.toBeInTheDocument()
	})

	it('shows the parcel with a tracking link and the expected delivery dates', () => {
		renderProgress(shippedOrder())

		expect(currentStep()).toHaveTextContent('Shipped')
		expect(currentStep()).toHaveTextContent('InPost620000111222333444555666')
		const link = screen.getByRole('link', { name: /Track parcel 620000111222333444555666/ })
		expect(link).toHaveAttribute('href', expect.stringContaining('inpost.pl'))
		expect(link).toHaveAttribute('target', '_blank')
		expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))

		expect(screen.getByText('Estimated delivery')).toBeInTheDocument()
		expect(screen.getByText(/18.*19 Nov/)).toBeInTheDocument()
		// steps reached show when they happened; upcoming ones do not
		expect(steps()[0].querySelector('time')).toHaveAttribute('dateTime', PLACED)
		expect(steps()[3].querySelector('time')).toBeNull()
	})

	it('links to the invoice, keeping the guest token', () => {
		renderProgress(shippedOrder({ invoice: { number: 'FV/2026/11/0007' } }), 'guest-token')
		const link = screen.getByRole('link', { name: /View invoice/ })
		expect(link).toHaveTextContent('FV/2026/11/0007')
		expect(link).toHaveAttribute(
			'href',
			'/orders/6a0000000000000000abc123/invoice?token=guest-token',
		)
	})

	it('highlights a delivered order and shows no estimate any more', () => {
		renderProgress(
			shippedOrder({
				status: 'delivered',
				deliveredAt: DELIVERED,
				estimatedDelivery: null,
			}),
		)
		expect(currentStep()).toHaveTextContent('Delivered')
		expect(currentStep()).toHaveTextContent('Enjoy your new clothes!')
		expect(screen.queryByText('Estimated delivery')).not.toBeInTheDocument()
		// the parcel stays visible after delivery
		expect(screen.getByRole('link', { name: /Track parcel/ })).toBeInTheDocument()
	})

	it('shows a cancelled order as a short timeline', () => {
		renderProgress(
			makeOrder({
				status: 'cancelled',
				statusHistory: [
					{ status: 'pending', at: PLACED },
					{ status: 'cancelled', at: PAID },
				],
			}),
		)
		expect(steps()).toHaveLength(2)
		expect(currentStep()).toHaveTextContent('Cancelled')
	})
})
