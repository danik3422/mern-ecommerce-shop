import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { adminKeys, fetchAdminProducts } from '../../api/admin'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { LOW_STOCK_THRESHOLD } from '../../data/catalog'
import { formatMoney } from '../../utils/money'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import SearchBox from '../components/SearchBox'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { allSizes, totalStock } from '../format'
import { useListParams } from '../useListParams'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
	{ value: '', label: 'All products' },
	{ value: 'active', label: 'Active' },
	{ value: 'hidden', label: 'Hidden' },
]

const ProductsList = () => {
	const { values, params, setParam, setPage } = useListParams({ q: '', status: '', lowStock: '' })
	const query = { ...params, limit: PAGE_SIZE }

	const products = useQuery({
		queryKey: adminKeys.products(query),
		queryFn: ({ signal }) => fetchAdminProducts(query, signal),
		placeholderData: keepPreviousData,
	})

	return (
		<>
			<PageHeader
				title='Products'
				description='Prices, stock and visibility of everything in the shop.'
				actions={
					<Button as={Link} to='/admin/products/new'>
						<Plus size={16} aria-hidden /> New product
					</Button>
				}
			/>

			<div className={table.toolbar}>
				<SearchBox
					key={values.q}
					label='Search by title, brand or slug'
					value={values.q}
					onSearch={(q) => setParam('q', q)}
				/>
				<Select
					label='Visibility'
					value={values.status}
					options={STATUS_OPTIONS}
					onChange={(e) => setParam('status', e.target.value)}
				/>
				<label className={table.check}>
					<input
						type='checkbox'
						checked={values.lowStock === 'true'}
						onChange={(e) => setParam('lowStock', e.target.checked ? 'true' : '')}
					/>
					Low stock only
				</label>
			</div>

			<QueryState query={products} label='products'>
				{(data) => (
					<>
						<div className={`${table.panel} ${table.scroll}`}>
							{data.items.length ? (
								<table className={table.table} aria-busy={products.isFetching}>
									<thead>
										<tr>
											<th scope='col'>
												<span className='visually-hidden'>Image</span>
											</th>
											<th scope='col'>Product</th>
											<th scope='col'>Status</th>
											<th scope='col' className={table.numeric}>
												Price
											</th>
											<th scope='col' className={table.numeric}>
												Stock
											</th>
										</tr>
									</thead>
									<tbody>
										{data.items.map((product) => {
											const stock = totalStock(product)
											const lowSizes = allSizes(product).filter(
												(size) => size.stock <= LOW_STOCK_THRESHOLD,
											).length
											return (
												<tr key={product._id}>
													<td>
														<img
															className={table.thumb}
															src={product.images[0]}
															alt=''
															loading='lazy'
														/>
													</td>
													<td>
														<Link to={`/admin/products/${product._id}`} className={table.rowLink}>
															{product.title}
														</Link>
														<div className={table.muted}>{product.brand}</div>
													</td>
													<td>
														<StatusBadge status={product.active ? 'active' : 'hidden'} />
													</td>
													<td className={table.numeric}>
														{formatMoney(product.price)}
														{product.onSale && (
															<div className={table.muted}>
																<s>{formatMoney(product.compareAtPrice)}</s> −
																{product.discountPercent}%
															</div>
														)}
													</td>
													<td className={table.numeric}>
														{stock === 0 ? <span className={table.danger}>Sold out</span> : stock}
														{stock > 0 && lowSizes > 0 && (
															<div className={table.muted}>
																{lowSizes} {lowSizes === 1 ? 'size' : 'sizes'} low
															</div>
														)}
													</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							) : (
								<p className={table.empty}>No products match these filters.</p>
							)}
						</div>
						<Pager {...data} limit={PAGE_SIZE} onChange={setPage} />
					</>
				)}
			</QueryState>
		</>
	)
}

export default ProductsList
