import { useParams, useSearchParams } from 'react-router'
import Pagination from '../components/product/Pagination'
import ProductFilters from '../components/product/ProductFilters'
import ProductGrid from '../components/product/ProductGrid'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'
import { capitalize } from '../utils/text'
import style from './ProductList.module.css'

const PAGE_SIZE = 12

/** Filters, sorting and page live in the URL, so a list can be shared and survives reloads. */
const ProductList = () => {
	const { category } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()

	const filters = {
		color: searchParams.get('color') ?? '',
		size: searchParams.get('size') ?? '',
		sort: searchParams.get('sort') ?? 'newest',
	}
	const page = Number(searchParams.get('page')) || 1

	const title = category ? capitalize(category) : 'All products'
	useDocumentTitle(title)
	const products = useProducts({ category, ...filters, page, limit: PAGE_SIZE })

	const updateParams = (changes) => {
		const next = new URLSearchParams(searchParams)
		for (const [name, value] of Object.entries(changes)) {
			if (value) next.set(name, value)
			else next.delete(name)
		}
		setSearchParams(next)
	}

	const total = products.data?.total

	return (
		<div className='container'>
			<div className={style.header}>
				<h1 className={style.title}>{title}</h1>
				{total !== undefined && (
					<p className={style.count}>
						{total} {total === 1 ? 'product' : 'products'}
					</p>
				)}
			</div>

			{/* any filter change starts again from the first page */}
			<ProductFilters
				values={filters}
				onChange={(name, value) => updateParams({ [name]: value, page: null })}
			/>

			<div className={style.results}>
				<ProductGrid query={products} skeletonCount={PAGE_SIZE} />
				{products.data && (
					<Pagination
						page={products.data.page}
						pages={products.data.pages}
						onChange={(next) => updateParams({ page: next })}
					/>
				)}
			</div>
		</div>
	)
}

export default ProductList
