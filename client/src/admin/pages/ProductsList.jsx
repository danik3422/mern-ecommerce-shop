import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
	Copy,
	ExternalLink,
	Eye,
	EyeOff,
	Pencil,
	Plus,
	SlidersHorizontal,
	Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { adminKeys, fetchAdminProducts, fetchProductFilters } from '../../api/admin'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import { useShopConfig } from '../../hooks/useShopConfig'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import { cx } from '../../utils/cx'
import BulkBar from '../components/BulkBar'
import IconButton from '../components/IconButton'
import PageHeader from '../components/PageHeader'
import Pager from '../components/Pager'
import QueryState from '../components/QueryState'
import QuickEditDrawer from '../components/QuickEditDrawer'
import SearchBox from '../components/SearchBox'
import StatusBadge from '../components/StatusBadge'
import table from '../components/Table.module.css'
import { allSizes, totalStock } from '../format'
import { useAdminConfirm } from '../useAdminConfirm'
import { useListParams } from '../useListParams'
import { useProductActions } from '../useProductActions'
import style from './ProductsList.module.css'

const PAGE_SIZE = 20

const FILTER_DEFAULTS = {
	q: '',
	status: '',
	category: '',
	brand: '',
	onSale: '',
	stock: '',
	sort: '',
}

const STATUS_OPTIONS = [
	{ value: '', label: 'Any visibility' },
	{ value: 'active', label: 'Visible' },
	{ value: 'hidden', label: 'Hidden' },
]

const DEFAULT_LOW_STOCK = 3

const stockOptions = (threshold) => [
	{ value: '', label: 'Any stock' },
	{ value: 'low', label: `Low (≤ ${threshold} in a size)` },
	{ value: 'out', label: 'Sold out' },
]

const SALE_OPTIONS = [
	{ value: '', label: 'Any price' },
	{ value: 'true', label: 'On sale' },
	{ value: 'false', label: 'Full price' },
]

const SORT_OPTIONS = [
	{ value: '', label: 'Newest first' },
	{ value: 'oldest', label: 'Oldest first' },
	{ value: 'title_asc', label: 'Title A–Z' },
	{ value: 'title_desc', label: 'Title Z–A' },
	{ value: 'price_asc', label: 'Price: low to high' },
	{ value: 'price_desc', label: 'Price: high to low' },
	{ value: 'stock_asc', label: 'Stock: lowest first' },
	{ value: 'stock_desc', label: 'Stock: highest first' },
]

const toOptions = (values, anyLabel, format = (value) => value) => [
	{ value: '', label: anyLabel },
	...(values ?? []).map((value) => ({ value, label: format(value) })),
]

// clicks on these inside a row do their own thing instead of opening the editor
const INTERACTIVE = 'a, button, input, label, select, textarea'

const ProductsList = () => {
	const navigate = useNavigate()
	const lowStockThreshold = useShopConfig()?.lowStockThreshold ?? DEFAULT_LOW_STOCK
	const { values, params, setParam, setParams, setPage } = useListParams(FILTER_DEFAULTS)
	const query = { ...params, limit: PAGE_SIZE }
	const hasFilters = Object.entries(values).some(([name, value]) => name !== 'sort' && value)

	const products = useQuery({
		queryKey: adminKeys.products(query),
		queryFn: ({ signal }) => fetchAdminProducts(query, signal),
		placeholderData: keepPreviousData,
	})
	const filters = useQuery({
		queryKey: adminKeys.productFilters,
		queryFn: ({ signal }) => fetchProductFilters(signal),
	})

	const { duplicate, toggleVisibility, remove, bulk } = useProductActions()
	const confirm = useAdminConfirm()
	const [quickEdit, setQuickEdit] = useState(null)

	const handleDelete = async (product) => {
		const confirmed = await confirm({
			title: 'Delete product?',
			message: `"${product.title}" will be removed from the shop and the admin panel. Past orders keep their copy. To take it off sale for now, hide it instead.`,
			confirmLabel: 'Delete product',
			tone: 'danger',
		})
		if (confirmed) remove.mutate(product)
	}

	// selection belongs to the rows on screen: a new page, filter or sort starts empty
	const scope = JSON.stringify(query)
	const [selection, setSelection] = useState({ scope, ids: new Set() })
	if (selection.scope !== scope) setSelection({ scope, ids: new Set() })
	const selected = selection.ids

	const items = products.data?.items ?? []
	const selectedItems = items.filter((product) => selected.has(product._id))
	const allSelected = items.length > 0 && selectedItems.length === items.length

	const setSelected = (ids) => setSelection({ scope, ids })
	const toggleOne = (id) => {
		const next = new Set(selected)
		if (next.has(id)) next.delete(id)
		else next.add(id)
		setSelected(next)
	}
	const toggleAll = () =>
		setSelected(allSelected ? new Set() : new Set(items.map((product) => product._id)))

	const runBulk = (action, extra) =>
		bulk.mutateAsync({ ids: selectedItems.map((p) => p._id), action, ...extra }).then(() => {
			if (action === 'delete') setSelected(new Set())
		})

	const openEditor = (e, product) => {
		if (e.target.closest(INTERACTIVE)) return
		navigate(`/admin/products/${product._id}`)
	}

	return (
		<>
			<PageHeader
				title='Products'
				description='Click a product to edit it. Select several for bulk changes.'
				actions={
					<Button as={Link} to='/admin/products/new'>
						<Plus size={16} aria-hidden /> New product
					</Button>
				}
			/>

			<div className={cx(table.toolbar, style.toolbar)}>
				<SearchBox
					key={values.q}
					label='Search by title, brand or slug'
					value={values.q}
					onSearch={(q) => setParam('q', q)}
				/>
				<Select
					label='Category'
					value={values.category}
					options={toOptions(filters.data?.categories, 'All categories', capitalize)}
					onChange={(e) => setParam('category', e.target.value)}
				/>
				<Select
					label='Brand'
					value={values.brand}
					options={toOptions(filters.data?.brands, 'All brands')}
					onChange={(e) => setParam('brand', e.target.value)}
				/>
				<Select
					label='Price'
					value={values.onSale}
					options={SALE_OPTIONS}
					onChange={(e) => setParam('onSale', e.target.value)}
				/>
				<Select
					label='Stock'
					value={values.stock}
					options={stockOptions(lowStockThreshold)}
					onChange={(e) => setParam('stock', e.target.value)}
				/>
				<Select
					label='Visibility'
					value={values.status}
					options={STATUS_OPTIONS}
					onChange={(e) => setParam('status', e.target.value)}
				/>
				<Select
					label='Sort by'
					value={values.sort}
					options={SORT_OPTIONS}
					onChange={(e) => setParam('sort', e.target.value)}
				/>
				{hasFilters && (
					<Button
						variant='ghost'
						className={style.clear}
						onClick={() =>
							setParams({ q: '', status: '', category: '', brand: '', onSale: '', stock: '' })
						}
					>
						Clear filters
					</Button>
				)}
			</div>

			{selectedItems.length > 0 && (
				<BulkBar
					products={selectedItems}
					pending={bulk.isPending}
					onAction={runBulk}
					onClear={() => setSelected(new Set())}
				/>
			)}

			<QueryState query={products} label='products'>
				{(data) => (
					<>
						<div className={`${table.panel} ${table.scroll}`}>
							{data.items.length ? (
								<table className={table.table} aria-busy={products.isFetching}>
									<thead>
										<tr>
											<th scope='col' className={style.checkCell}>
												<input
													type='checkbox'
													className={style.checkbox}
													checked={allSelected}
													ref={(input) => {
														if (input) {
															input.indeterminate = selectedItems.length > 0 && !allSelected
														}
													}}
													onChange={toggleAll}
													aria-label='Select all products on this page'
												/>
											</th>
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
											<th scope='col' className={style.actionsHead}>
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{data.items.map((product) => {
											const stock = totalStock(product)
											const lowSizes = allSizes(product).filter(
												(size) => size.stock <= lowStockThreshold,
											).length
											const isSelected = selected.has(product._id)
											return (
												<tr
													key={product._id}
													className={cx(style.row, isSelected && style.selectedRow)}
													onClick={(e) => openEditor(e, product)}
												>
													<td className={style.checkCell}>
														<input
															type='checkbox'
															className={style.checkbox}
															checked={isSelected}
															onChange={() => toggleOne(product._id)}
															aria-label={`Select ${product.title}`}
														/>
													</td>
													<td>
														<img
															className={table.thumb}
															src={product.images[0]}
															alt=''
															loading='lazy'
														/>
													</td>
													<td>
														<Link to={`/admin/products/${product._id}`} className={style.title}>
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
															<div className={table.warning}>
																{lowSizes} {lowSizes === 1 ? 'size' : 'sizes'} low
															</div>
														)}
													</td>
													<td>
														<div className={style.rowActions}>
															<IconButton
																as={Link}
																to={`/admin/products/${product._id}`}
																label={`Edit ${product.title}`}
															>
																<Pencil size={16} aria-hidden />
															</IconButton>
															<IconButton
																label={`Quick edit price and stock of ${product.title}`}
																onClick={() => setQuickEdit(product)}
															>
																<SlidersHorizontal size={16} aria-hidden />
															</IconButton>
															{product.active ? (
																<IconButton
																	as='a'
																	href={`/product/${product.slug}`}
																	target='_blank'
																	rel='noreferrer'
																	label={`View ${product.title} in the shop`}
																>
																	<ExternalLink size={16} aria-hidden />
																</IconButton>
															) : (
																<IconButton
																	label='Hidden products are not in the shop'
																	aria-disabled='true'
																	onClick={(e) => e.preventDefault()}
																>
																	<ExternalLink size={16} aria-hidden />
																</IconButton>
															)}
															<IconButton
																label={`Duplicate ${product.title}`}
																disabled={duplicate.isPending}
																onClick={() => duplicate.mutate(product)}
															>
																<Copy size={16} aria-hidden />
															</IconButton>
															<IconButton
																label={
																	product.active
																		? `Hide ${product.title} from the shop`
																		: `Show ${product.title} in the shop`
																}
																disabled={toggleVisibility.isPending}
																onClick={() => toggleVisibility.mutate(product)}
															>
																{product.active ? (
																	<EyeOff size={16} aria-hidden />
																) : (
																	<Eye size={16} aria-hidden />
																)}
															</IconButton>
															<IconButton
																label={`Delete ${product.title}`}
																tone='danger'
																onClick={() => handleDelete(product)}
															>
																<Trash2 size={16} aria-hidden />
															</IconButton>
														</div>
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

			{quickEdit && <QuickEditDrawer product={quickEdit} onClose={() => setQuickEdit(null)} />}
		</>
	)
}

export default ProductsList
