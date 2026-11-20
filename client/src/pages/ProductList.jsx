import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import ActiveFilters from '../components/product/ActiveFilters'
import {
	activeFilterChips,
	clearFilterParams,
	readFilters,
	toApiQuery,
	toFacetScope,
	updateFilterParams,
} from '../components/product/catalogFilters'
import FilterPanel from '../components/product/FilterPanel'
import Pagination from '../components/product/Pagination'
import ProductGrid from '../components/product/ProductGrid'
import Button from '../components/ui/Button'
import Drawer from '../components/ui/Drawer'
import Select from '../components/ui/Select'
import { CATEGORY_TITLES, SALE_CATEGORY, SORT_OPTIONS } from '../data/catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFacets, useProducts } from '../hooks/useProducts'
import { capitalize } from '../utils/text'
import style from './ProductList.module.css'

const PAGE_SIZE = 24

const pageTitle = (category, q) => {
	if (q) return `Results for “${q}”`
	if (!category) return 'All products'
	return CATEGORY_TITLES[category] ?? capitalize(category)
}

/** Catalog: category, sale or search results with filters kept in the URL. */
const ProductList = () => {
	const { category } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)

	const filters = readFilters(searchParams)
	const isSale = category === SALE_CATEGORY
	const title = pageTitle(category, filters.q)
	useDocumentTitle(title)

	const products = useProducts(toApiQuery(filters, category, PAGE_SIZE))
	const facets = useFacets(toFacetScope(filters, category))

	const applyChanges = (changes) => setSearchParams(updateFilterParams(searchParams, changes))
	const clearAll = () => setSearchParams(clearFilterParams(searchParams))
	const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

	const chips = activeFilterChips(isSale ? { ...filters, onSale: false } : filters)
	const total = products.data?.total
	const countText = total === undefined ? '' : `${total} ${total === 1 ? 'product' : 'products'}`

	const filterPanel = (
		<FilterPanel
			filters={filters}
			facets={facets.data}
			onChange={applyChanges}
			hideSaleToggle={isSale}
		/>
	)

	return (
		<div className='container'>
			<div className={style.header}>
				<div>
					{filters.q && category && (
						<p className='eyebrow'>{CATEGORY_TITLES[category] ?? capitalize(category)}</p>
					)}
					<h1 className={style.title}>{title}</h1>
				</div>
				<p className={style.count} aria-live='polite'>
					{countText}
				</p>
			</div>

			<div className={style.toolbar}>
				<Button
					variant='secondary'
					size='sm'
					className={style.filterButton}
					onClick={() => setIsDrawerOpen(true)}
					aria-haspopup='dialog'
				>
					<SlidersHorizontal size={16} aria-hidden /> Filters
					{chips.length > 0 && ` (${chips.length})`}
				</Button>
				<Select
					label='Sort by'
					hideLabel
					name='sort'
					value={filters.sort}
					options={SORT_OPTIONS}
					onChange={(e) => applyChanges({ sort: e.target.value })}
					className={style.sort}
				/>
			</div>

			<ActiveFilters chips={chips} onRemove={applyChanges} onClearAll={clearAll} />

			<div className={style.layout}>
				<aside className={style.sidebar} aria-label='Filters'>
					{filterPanel}
				</aside>

				<section className={style.results} aria-label='Products'>
					{products.data?.total === 0 ? (
						<div className={style.empty}>
							<p>
								{filters.q
									? `No products found for “${filters.q}”.`
									: 'No products match these filters.'}
							</p>
							{chips.length > 0 ? (
								<Button variant='secondary' onClick={clearAll}>
									Clear filters
								</Button>
							) : (
								<Button as={Link} to='/products' variant='secondary'>
									Browse all products
								</Button>
							)}
						</div>
					) : (
						<>
							<ProductGrid query={products} skeletonCount={12} />
							{products.data && (
								<Pagination
									page={products.data.page}
									pages={products.data.pages}
									onChange={(page) => {
										applyChanges({ page })
										window.scrollTo(0, 0)
									}}
								/>
							)}
						</>
					)}
				</section>
			</div>

			{isDrawerOpen && (
				<Drawer
					title='Filters'
					side='left'
					closeLabel='Close filters'
					onClose={closeDrawer}
					footer={
						<Button fullWidth onClick={closeDrawer}>
							{total === undefined ? 'Show products' : `Show ${countText}`}
						</Button>
					}
				>
					{filterPanel}
				</Drawer>
			)}
		</div>
	)
}

export default ProductList
