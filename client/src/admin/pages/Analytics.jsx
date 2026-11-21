import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { analyticsKey, fetchAnalytics } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import { returnReasonLabel } from '../../components/orders/returns'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { cx } from '../../utils/cx'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import PageHeader from '../components/PageHeader'
import table from '../components/Table.module.css'
import BarList from '../components/charts/BarList'
import {
	formatCompactMoney,
	formatCount,
	formatDayRange,
	formatPercent,
} from '../components/charts/chartFormat'
import ColumnChart from '../components/charts/ColumnChart'
import Funnel from '../components/charts/Funnel'
import KpiCard from '../components/charts/KpiCard'
import PeriodPicker from '../components/charts/PeriodPicker'
import { DEFAULT_PERIOD, resolvePeriod, shopToday } from '../components/charts/period'
import TrendChart from '../components/charts/TrendChart'
import style from './Analytics.module.css'

const rate = (value) => formatPercent(value)

/** KPI cards in display order. */
const KPIS = [
	{ name: 'revenue', label: 'Revenue', format: formatMoney, hint: 'Paid orders, minus refunds' },
	{ name: 'orders', label: 'Orders', format: formatCount, hint: 'Paid, shipped or delivered' },
	{ name: 'averageOrderValue', label: 'Avg. order value', format: formatMoney },
	{ name: 'unitsSold', label: 'Units sold', format: formatCount },
	{ name: 'newCustomers', label: 'New customers', format: formatCount, hint: 'Accounts created' },
	{
		name: 'returningCustomerRate',
		label: 'Returning customers',
		format: rate,
		hint: 'Buyers with more than one order',
	},
	{ name: 'returnRate', label: 'Return rate', format: rate, lowerIsBetter: true },
	{ name: 'cancelledRate', label: 'Cancelled', format: rate, lowerIsBetter: true },
]

const FUNNEL_HINTS = {
	carts: 'Open carts + carts that became orders',
	placed: 'Any status',
	paid: 'Paid, shipped or delivered',
	delivered: 'Reached the customer',
}

const METRICS = {
	revenue: { label: 'Revenue', format: formatMoney, formatAxis: formatCompactMoney },
	orders: { label: 'Orders', format: formatCount, formatAxis: formatCount, integer: true },
}

// clothing sizes in their natural order; numeric sizes (e.g. 38, 40) and others follow
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const sizeRank = (size) => {
	const index = SIZE_ORDER.indexOf(size.toUpperCase())
	if (index >= 0) return index
	const number = Number.parseFloat(size)
	return Number.isNaN(number) ? 1e6 : 100 + number
}
const bySize = (a, b) => sizeRank(a.size) - sizeRank(b.size) || a.size.localeCompare(b.size)

/** A titled block of the analytics grid. */
const Panel = ({ title, description, action, span = 'half', children, className }) => (
	<section className={cx(table.panel, style.panel, style[span], className)} aria-label={title}>
		<div className={style.panelHeader}>
			<div>
				<h2 className={style.panelTitle}>{title}</h2>
				{description && <p className={style.panelDescription}>{description}</p>}
			</div>
			{action}
		</div>
		{children}
	</section>
)

/** Small segmented switch, e.g. revenue/orders. */
const Toggle = ({ label, options, value, onChange }) => (
	<div className={style.toggle} role='group' aria-label={label}>
		{options.map((option) => (
			<button
				key={option.value}
				type='button'
				aria-pressed={value === option.value}
				className={cx(style.toggleButton, value === option.value && style.toggleSelected)}
				onClick={() => onChange(option.value)}
			>
				{option.label}
			</button>
		))}
	</div>
)

const Stat = ({ label, value }) => (
	<div className={style.stat}>
		<dt>{label}</dt>
		<dd>{value}</dd>
	</div>
)

const Empty = ({ children }) => <p className={style.empty}>{children}</p>

/** Placeholder blocks in the shape of the page while the first report loads. */
const Skeleton = () => (
	<div className={style.grid} aria-busy='true' aria-label='Loading analytics'>
		<div className={style.kpis}>
			{KPIS.map((kpi) => (
				<div key={kpi.name} className={cx(style.skeletonCard)}>
					<span className={style.skeletonLine} style={{ width: '45%' }} />
					<span className={style.skeletonValue} />
					<span className={style.skeletonLine} style={{ width: '60%' }} />
				</div>
			))}
		</div>
		{['full', 'half', 'half', 'full'].map((span, i) => (
			<div key={i} className={cx(table.panel, style.panel, style[span])}>
				<span className={style.skeletonLine} style={{ width: '30%' }} />
				<span className={style.skeletonBlock} />
			</div>
		))}
	</div>
)

/** Sales over time with a revenue/orders switch and the previous period as comparison. */
const SalesPanel = ({ data }) => {
	const [metric, setMetric] = useState('revenue')
	const { series, period } = data
	const config = METRICS[metric]
	const total = series.current.reduce((sum, bucket) => sum + bucket[metric], 0)
	const currentLabel = formatDayRange(period.from, period.to, { year: true })
	const previousLabel = period.previous
		? formatDayRange(period.previous.from, period.previous.to, { year: true })
		: null

	return (
		<Panel
			span='full'
			title='Sales over time'
			description={`${config.label} per ${series.interval}${previousLabel ? `, compared with ${previousLabel}` : ''}`}
			action={
				<Toggle
					label='Measure'
					value={metric}
					onChange={setMetric}
					options={Object.entries(METRICS).map(([value, { label }]) => ({ value, label }))}
				/>
			}
		>
			<p className={style.total}>
				{config.format(total)}
				<span>
					{' '}
					{metric === 'revenue' ? 'net revenue' : 'paid orders'} in {formatCount(period.days)} days
				</span>
			</p>
			<TrendChart
				title={`${config.label} per ${series.interval}, ${currentLabel}`}
				buckets={series.current}
				previous={series.previous}
				valueKey={metric}
				format={config.format}
				formatAxis={config.formatAxis}
				integer={config.integer}
				currentLabel={currentLabel}
				previousLabel={previousLabel}
			/>
		</Panel>
	)
}

/** Best sellers by revenue or by units, with each one's share as a mini bar. */
const TopProductsPanel = ({ products }) => {
	const [sort, setSort] = useState('revenue')
	const rows = sort === 'revenue' ? products.byRevenue : products.byUnits

	return (
		<Panel
			span='full'
			title='Top products'
			description='Item revenue before order discounts; share of all items sold'
			action={
				<Toggle
					label='Rank by'
					value={sort}
					onChange={setSort}
					options={[
						{ value: 'revenue', label: 'By revenue' },
						{ value: 'units', label: 'By units' },
					]}
				/>
			}
		>
			{rows.length ? (
				<div className={table.scroll}>
					<table className={cx(table.table, style.productsTable)}>
						<thead>
							<tr>
								<th scope='col' className={style.rank}>
									#
								</th>
								<th scope='col'>Product</th>
								<th scope='col' className={table.numeric}>
									Units
								</th>
								<th scope='col' className={table.numeric}>
									Revenue
								</th>
								<th scope='col' className={style.shareHead}>
									Share of {sort}
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row, i) => (
								<tr key={row.productId}>
									<td className={cx(table.muted, style.rank)}>{i + 1}</td>
									<td>
										<Link to={`/admin/products/${row.productId}`} className={table.rowLink}>
											{row.title}
										</Link>
										<span className={style.brand}>{row.brand}</span>
									</td>
									<td className={table.numeric}>{formatCount(row.units)}</td>
									<td className={table.numeric}>{formatMoney(row.revenue)}</td>
									<td>
										<span className={style.share}>
											<span className={style.miniTrack} aria-hidden>
												<span
													className={style.miniBar}
													style={{ width: `${(row.share / rows[0].share) * 100}%` }}
												/>
											</span>
											<span className={style.shareValue}>{formatPercent(row.share)}</span>
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<Empty>No products were sold in this period.</Empty>
			)}
		</Panel>
	)
}

const groupItems = (groups) =>
	groups.map((group) => ({
		key: group.name,
		label: group.name,
		value: formatMoney(group.revenue),
		detail: formatPercent(group.share),
		amount: group.revenue,
	}))

const ReturnsPanels = ({ returns }) => (
	<>
		<Panel title='Returns' description='Return requests for orders placed in this period'>
			<dl className={style.stats}>
				<Stat label='Returns' value={formatCount(returns.count)} />
				<Stat label='Return rate' value={formatPercent(returns.rate)} />
				<Stat label='Refunded' value={formatMoney(returns.refunded)} />
			</dl>
			<h3 className={style.subTitle}>Top reasons</h3>
			<BarList
				label='Return reasons'
				empty='No returns in this period.'
				items={returns.reasons.map((row) => ({
					key: row.reason,
					label: returnReasonLabel(row.reason),
					value: formatCount(row.count),
					detail: formatPercent(row.share),
					amount: row.count,
				}))}
			/>
		</Panel>
		<Panel
			title='Most returned products'
			description={`Returned units ÷ units sold, products with at least ${returns.minSample} sold`}
		>
			{returns.products.length ? (
				<table className={table.table}>
					<thead>
						<tr>
							<th scope='col'>Product</th>
							<th scope='col' className={table.numeric}>
								Sold
							</th>
							<th scope='col' className={table.numeric}>
								Returned
							</th>
							<th scope='col' className={table.numeric}>
								Rate
							</th>
						</tr>
					</thead>
					<tbody>
						{returns.products.map((row) => (
							<tr key={row.productId}>
								<td>
									<Link to={`/admin/products/${row.productId}`} className={table.rowLink}>
										{row.title}
									</Link>
									<span className={style.brand}>{row.brand}</span>
								</td>
								<td className={table.numeric}>{formatCount(row.sold)}</td>
								<td className={table.numeric}>{formatCount(row.returned)}</td>
								<td className={cx(table.numeric, row.rate >= 0.2 && table.danger)}>
									{formatPercent(row.rate)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : (
				<Empty>No product has enough sales and returns to rank yet.</Empty>
			)}
		</Panel>
	</>
)

/** All panels of a loaded report. */
const Report = ({ data }) => {
	const placed = data.funnel.find((step) => step.id === 'placed').count
	const sizes = data.products.sizes.toSorted(bySize)

	return (
		<div className={style.grid}>
			{!placed && (
				<Alert className={style.full}>
					No orders were placed between {formatDayRange(data.period.from, data.period.to)}. Try a
					longer period.
				</Alert>
			)}

			<div className={style.kpis}>
				{KPIS.map(({ name, ...kpi }) => (
					<KpiCard key={name} {...kpi} kpi={data.kpis[name]} />
				))}
			</div>

			<SalesPanel data={data} />

			<Panel
				title='Conversion funnel'
				description='Estimated from carts and orders — the shop does not track page views'
			>
				<Funnel
					label='Conversion funnel'
					steps={data.funnel.map((step) => ({ ...step, hint: FUNNEL_HINTS[step.id] }))}
				/>
			</Panel>

			<Panel title='Order status' description='All orders placed in this period'>
				<BarList
					label='Orders by status'
					empty='No orders in this period.'
					items={
						placed
							? data.statuses.map((row) => ({
									key: row.name,
									label: capitalize(row.name),
									value: formatCount(row.orders),
									detail: formatPercent(row.share),
									amount: row.orders,
								}))
							: []
					}
				/>
			</Panel>

			<TopProductsPanel products={data.products} />

			<Panel title='Categories' span='third' description='Products can be in several'>
				<BarList
					label='Revenue by category'
					empty='No sales in this period.'
					items={groupItems(data.products.categories)}
				/>
			</Panel>
			<Panel title='Brands' span='third'>
				<BarList
					label='Revenue by brand'
					empty='No sales in this period.'
					items={groupItems(data.products.brands)}
				/>
			</Panel>
			<Panel title='Sizes sold' span='third' description='Share of units'>
				{sizes.length ? (
					<ColumnChart
						label='Units sold per size'
						unit='units'
						items={sizes.map((row) => ({
							key: row.size,
							label: row.size,
							amount: row.units,
							share: row.share,
						}))}
					/>
				) : (
					<Empty>No sales in this period.</Empty>
				)}
			</Panel>

			<ReturnsPanels returns={data.returns} />

			<Panel title='Delivery methods' description='Paid orders'>
				<BarList
					label='Orders by delivery method'
					empty='No paid orders in this period.'
					items={data.delivery.map((row) => ({
						key: row.name,
						label: row.name,
						value: formatCount(row.orders),
						detail: formatPercent(row.share),
						amount: row.orders,
					}))}
				/>
			</Panel>

			<Panel
				title='Promo codes'
				description='Paid orders with a code'
				action={
					<Link to='/admin/promo-codes' className='text-link'>
						Manage
					</Link>
				}
			>
				<dl className={style.stats}>
					<Stat label='Orders' value={formatCount(data.promoCodes.orders)} />
					<Stat label='Of paid orders' value={formatPercent(data.promoCodes.share)} />
					<Stat label='Discount given' value={formatMoney(data.promoCodes.discount)} />
				</dl>
				<BarList
					label='Orders per promo code'
					empty='No promo codes were used in this period.'
					items={data.promoCodes.codes.map((row) => ({
						key: row.name,
						label: row.name,
						value: formatCount(row.orders),
						detail: `−${formatMoney(row.discount)}`,
						amount: row.orders,
					}))}
				/>
			</Panel>
		</div>
	)
}

/**
 * /admin/analytics — sales, conversion, products and returns for a period kept in the URL
 * (`?period=7d|30d|90d|month|last-month|custom&from&to&compare=none`).
 */
const Analytics = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const today = shopToday()
	const value = resolvePeriod(
		{
			period: searchParams.get('period') ?? DEFAULT_PERIOD,
			from: searchParams.get('from'),
			to: searchParams.get('to'),
		},
		today,
	)
	const compare = searchParams.get('compare') !== 'none'
	const params = { from: value.from, to: value.to, compare: compare ? 'previous' : 'none' }

	const report = useQuery({
		queryKey: analyticsKey(params),
		queryFn: ({ signal }) => fetchAnalytics(params, signal),
		// keep showing the last report while another period loads
		placeholderData: keepPreviousData,
	})

	const update = (changes) => {
		const next = new URLSearchParams(searchParams)
		for (const [name, change] of Object.entries(changes)) {
			if (change) next.set(name, change)
			else next.delete(name)
		}
		setSearchParams(next, { replace: true })
	}
	const choosePreset = (period) =>
		update(
			period === 'custom'
				? { period, from: value.from, to: value.to }
				: { period: period === DEFAULT_PERIOD ? null : period, from: null, to: null },
		)

	return (
		<>
			<PageHeader
				title='Analytics'
				description={`${formatDayRange(value.from, value.to, { year: true })} · days in Europe/Warsaw time`}
				actions={
					<PeriodPicker
						value={value}
						today={today}
						compare={compare}
						onPreset={choosePreset}
						onCustom={(range) => update({ period: 'custom', ...range })}
						onCompareChange={(checked) => update({ compare: checked ? null : 'none' })}
					/>
				}
			/>
			{report.isPending ? (
				<Skeleton />
			) : report.isError ? (
				<Alert tone='error' className={style.error}>
					Could not load analytics: {getErrorMessage(report.error)}
					<Button variant='ghost' size='sm' onClick={() => report.refetch()}>
						Try again
					</Button>
				</Alert>
			) : (
				<div className={cx(style.report, report.isPlaceholderData && style.stale)}>
					<Report data={report.data} />
				</div>
			)}
		</>
	)
}

export default Analytics
