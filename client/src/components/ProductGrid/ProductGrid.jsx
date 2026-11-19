import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchProducts, productKeys } from '../../api/products'
import { getErrorMessage } from '../../api/client'
import Pagination from '../Pagination/Pagination'
import ProductCard from '../ProductCard/ProductCard'
import style from './ProductGrid.module.css'

/**
 * @param query API filters: `{ category?, color?, size?, sort?, page?, limit? }`
 * @param onPageChange when passed, pagination controls are shown
 */
const ProductGrid = ({ query, onPageChange }) => {
	const { data, error, isPending, isError } = useQuery({
		queryKey: productKeys.list(query),
		queryFn: ({ signal }) => fetchProducts(query, signal),
		placeholderData: keepPreviousData,
	})

	if (isPending) return <p className={style.message}>Loading products…</p>
	if (isError) {
		return <p className={style.message}>Could not load products: {getErrorMessage(error)}</p>
	}
	if (!data.items.length) return <p className={style.message}>No products found.</p>

	return (
		<>
			<div className={style.container}>
				{data.items.map((product) => (
					<ProductCard product={product} key={product._id} />
				))}
			</div>
			{onPageChange && <Pagination page={data.page} pages={data.pages} onChange={onPageChange} />}
		</>
	)
}

export default ProductGrid
