import { getErrorMessage } from '../../api/client'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import style from './ProductGrid.module.css'

/**
 * Shows products, skeletons while loading, or an error with a retry button.
 * @param query result of `useProducts`
 */
const ProductGrid = ({ query, skeletonCount = 8 }) => {
	if (query.isPending) {
		return (
			<div className={style.grid} aria-busy='true' aria-label='Loading products'>
				{Array.from({ length: skeletonCount }, (_, i) => (
					<ProductCardSkeleton key={i} />
				))}
			</div>
		)
	}

	if (query.isError) {
		return (
			<Alert tone='error' className={style.error}>
				Could not load products: {getErrorMessage(query.error)}.{' '}
				<Button variant='ghost' size='sm' onClick={() => query.refetch()}>
					Try again
				</Button>
			</Alert>
		)
	}

	if (!query.data.items.length) {
		return <p className={style.empty}>No products match these filters.</p>
	}

	return (
		<ul role='list' className={style.grid} aria-busy={query.isFetching}>
			{query.data.items.map((product) => (
				<li key={product._id}>
					<ProductCard product={product} />
				</li>
			))}
		</ul>
	)
}

export default ProductGrid
