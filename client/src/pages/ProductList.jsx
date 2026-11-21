import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import ActiveFilters from '../components/product/ActiveFilters'
import {
	activeFilterChips,
	clearFilterParams,
	readFilters,
	SEARCH_SORT,
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
import { SALE_CATEGORY, SORT_VALUES } from '../data/catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFacets, useProducts } from '../hooks/useProducts'
import style from './ProductList.module.css'
import { categoryTitle } from '../i18n/catalogText'
import { useI18n } from '../i18n/useI18n'

const PAGE_SIZE = 24

const pageTitle = (t, category, q) => {
	if (q) return t('list.resultsFor', { query: q })
	if (!category) return t('list.allProducts')
	return categoryTitle(t, category)
}

/** Catalog: category, sale or search results with filters kept in the URL. */
const ProductList = () => {
	const { category } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()
	const [isDrawerOpen, setIsDrawerOpen] = useState(false)
	const { t } = useI18n()

	const filters = readFilters(searchParams)
	const isSale = category === SALE_CATEGORY
	const products = useProducts(toApiQuery(filters, category, PAGE_SIZE))
	// set when the search corrected a typo ("jaket" → "jacket")
	const correctedQuery = filters.q ? products.data?.search?.correctedQuery : null
	const title = pageTitle(t, category, correctedQuery ?? filters.q)
	useDocumentTitle(title)

	const facets = useFacets(toFacetScope(filters, category))

	const applyChanges = (changes) => setSearchParams(updateFilterParams(searchParams, changes))
	const clearAll = () => setSearchParams(clearFilterParams(searchParams))
	const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
	const sortValues = filters.q ? [SEARCH_SORT, ...SORT_VALUES] : SORT_VALUES

	const chips = activeFilterChips(isSale ? { ...filters, onSale: false } : filters)
	const total = products.data?.total
	const countText = total === undefined ? '' : t('common.products', { count: total })

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
					{filters.q && category && <p className='eyebrow'>{categoryTitle(t, category)}</p>}
					<h1 className={style.title}>{title}</h1>
					{correctedQuery && (
						<p className={style.correction}>
							{t('list.showingResultsFor', { query: correctedQuery })}{' '}
							<Link
								to={{ search: `?${updateFilterParams(searchParams, { exact: true })}` }}
								className='text-link'
							>
								{t('list.searchInstead', { query: filters.q })}
							</Link>
						</p>
					)}
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
					<SlidersHorizontal size={16} aria-hidden /> {t('list.filters')}
					{chips.length > 0 && ` (${chips.length})`}
				</Button>
				<Select
					label={t('list.sortBy')}
					hideLabel
					name='sort'
					value={filters.sort}
					options={sortValues.map((value) => ({ value, label: t(`sort.${value}`) }))}
					onChange={(e) => applyChanges({ sort: e.target.value })}
					className={style.sort}
				/>
			</div>

			<ActiveFilters chips={chips} onRemove={applyChanges} onClearAll={clearAll} />

			<div className={style.layout}>
				<aside className={style.sidebar} aria-label={t('list.filters')}>
					{filterPanel}
				</aside>

				<section className={style.results} aria-label={t('search.products')}>
					{products.data?.total === 0 ? (
						<div className={style.empty}>
							<p>
								{filters.q ? t('list.noResultsFor', { query: filters.q }) : t('list.noMatches')}
							</p>
							{chips.length > 0 ? (
								<Button variant='secondary' onClick={clearAll}>
									{t('list.clearFilters')}
								</Button>
							) : (
								<Button as={Link} to='/products' variant='secondary'>
									{t('list.browseAll')}
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
					title={t('list.filters')}
					side='left'
					closeLabel={t('list.closeFilters')}
					onClose={closeDrawer}
					footer={
						<Button fullWidth onClick={closeDrawer}>
							{total === undefined
								? t('list.showProducts')
								: t('list.show', { products: countText })}
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
