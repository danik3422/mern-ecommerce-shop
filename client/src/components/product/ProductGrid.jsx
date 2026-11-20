import { getErrorMessage } from '../../api/client'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import style from './ProductGrid.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Shows products, skeletons while loading, or an error with a retry button.
 * @param query result of `useProducts`
 */
const ProductGrid = ({ query, skeletonCount = 8 }) => {
	const { t } = useI18n()
	if (query.isPending) {
		return (
			<div className={style.grid} aria-busy='true' aria-label={t('grid.loading')}>
				{Array.from({ length: skeletonCount }, (_, i) => (
					<ProductCardSkeleton key={i} />
				))}
			</div>
		)
	}

	if (query.isError) {
		return (
			<Alert tone='error' className={style.error}>
				{t('grid.error', { error: getErrorMessage(query.error) })}{' '}
				<Button variant='ghost' size='sm' onClick={() => query.refetch()}>
					{t('common.tryAgain')}
				</Button>
			</Alert>
		)
	}

	if (!query.data.items.length) {
		return <p className={style.empty}>{t('grid.empty')}</p>
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
