import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { adminKeys, fetchAdminStats } from '../../api/admin'
import { formatMoney } from '../../utils/money'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import RevenueChart from '../components/RevenueChart'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { formatDateTime, orderNumber } from '../format'
import style from './Dashboard.module.css'

const Kpi = ({ label, value, hint }) => (
	<div className={style.kpi}>
		<p className={style.kpiLabel}>{label}</p>
		<p className={style.kpiValue}>{value}</p>
		{hint && <p className={style.kpiHint}>{hint}</p>}
	</div>
)

/** @param wide span the full width of the dashboard grid (for wide tables) */
const Panel = ({ title, action, wide = false, children }) => (
	<section className={`${table.panel} ${style.panel} ${wide ? style.wide : ''}`} aria-label={title}>
		<div className={style.panelHeader}>
			<h2 className={style.panelTitle}>{title}</h2>
			{action}
		</div>
		{children}
	</section>
)

const Dashboard = () => {
	const stats = useQuery({ queryKey: adminKeys.stats, queryFn: fetchAdminStats })

	return (
		<>
			<PageHeader title='Dashboard' description='How the shop is doing right now.' />
			<QueryState query={stats} label='statistics'>
				{(data) => (
					<div className={style.grid}>
						<div className={style.kpis}>
							<Kpi
								label='Revenue'
								value={formatMoney(data.revenue)}
								hint='All orders except cancelled'
							/>
							<Kpi
								label='Orders'
								value={data.orders}
								hint={`${data.ordersByStatus.pending} waiting for payment`}
							/>
							<Kpi label='Customers' value={data.customers} />
							<Kpi
								label='Products'
								value={data.products.active}
								hint={`${data.products.total - data.products.active} hidden`}
							/>
						</div>

						<Panel title='Revenue'>
							<RevenueChart days={data.revenuePerDay} />
						</Panel>

						<Panel title='Orders by status'>
							<ul role='list' className={style.statusList}>
								{Object.entries(data.ordersByStatus).map(([status, count]) => (
									<li key={status}>
										<Link to={`/admin/orders?status=${status}`} className={style.statusRow}>
											<StatusBadge status={status} />
											<span className={table.numeric}>{count}</span>
										</Link>
									</li>
								))}
							</ul>
						</Panel>

						<Panel
							wide
							title='Recent orders'
							action={
								<Link to='/admin/orders' className='text-link'>
									All orders
								</Link>
							}
						>
							{data.recentOrders.length ? (
								<div className={table.scroll}>
									<table className={table.table}>
										<thead>
											<tr>
												<th scope='col'>Order</th>
												<th scope='col'>Customer</th>
												<th scope='col'>Date</th>
												<th scope='col'>Status</th>
												<th scope='col' className={table.numeric}>
													Total
												</th>
											</tr>
										</thead>
										<tbody>
											{data.recentOrders.map((order) => (
												<tr key={order._id}>
													<td>
														<Link to={`/admin/orders/${order._id}`} className={table.rowLink}>
															{orderNumber(order._id)}
														</Link>
													</td>
													<td>
														{order.user?.username ??
															(order.user === null ? 'Deleted account' : 'Guest')}
													</td>
													<td className={`${table.muted} ${table.nowrap}`}>
														{formatDateTime(order.createdAt)}
													</td>
													<td>
														<StatusBadge status={order.status} />
													</td>
													<td className={table.numeric}>{formatMoney(order.amount)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<p className={table.empty}>No orders yet.</p>
							)}
						</Panel>

						<Panel
							title='Low stock'
							action={
								<Link to='/admin/products?lowStock=true' className='text-link'>
									View products
								</Link>
							}
						>
							{data.lowStock.length ? (
								<table className={table.table}>
									<thead>
										<tr>
											<th scope='col'>Product</th>
											<th scope='col'>Color, size</th>
											<th scope='col' className={table.numeric}>
												Left
											</th>
										</tr>
									</thead>
									<tbody>
										{data.lowStock.map((row) => (
											<tr key={`${row.productId}-${row.color}-${row.size}`}>
												<td>
													<Link to={`/admin/products/${row.productId}`} className={table.rowLink}>
														{row.title}
													</Link>
												</td>
												<td>
													{row.color}, {row.size}
												</td>
												<td className={`${table.numeric} ${row.stock === 0 ? style.out : ''}`}>
													{row.stock === 0 ? 'Sold out' : row.stock}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>Everything is well stocked.</p>
							)}
						</Panel>

						<Panel title='Best sellers'>
							{data.topProducts.length ? (
								<table className={table.table}>
									<thead>
										<tr>
											<th scope='col'>Product</th>
											<th scope='col' className={table.numeric}>
												Sold
											</th>
											<th scope='col' className={table.numeric}>
												Revenue
											</th>
										</tr>
									</thead>
									<tbody>
										{data.topProducts.map((product) => (
											<tr key={product.productId}>
												<td>
													<span className={style.brand}>{product.brand}</span> {product.title}
												</td>
												<td className={table.numeric}>{product.quantity}</td>
												<td className={table.numeric}>{formatMoney(product.revenue)}</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>No sales yet.</p>
							)}
						</Panel>
					</div>
				)}
			</QueryState>
		</>
	)
}

export default Dashboard
