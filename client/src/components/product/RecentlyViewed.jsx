import { useQuery } from '@tanstack/react-query'
import { fetchProducts, productKeys } from '../../api/products'
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed'
import ProductCard from './ProductCard'
import style from './RecentlyViewed.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Products this visitor looked at recently, newest first.
 * @param excludeId hide the product of the current page
 * @param limit how many to show
 */
const RecentlyViewed = ({ excludeId, limit = 4 }) => {
	const { t } = useI18n()
	const { ids } = useRecentlyViewed()
	const visibleIds = ids.filter((id) => id !== excludeId).slice(0, limit)
	const params = { ids: visibleIds.join(','), limit }

	const { data } = useQuery({
		queryKey: productKeys.list(params),
		queryFn: ({ signal }) => fetchProducts(params, signal),
		enabled: visibleIds.length > 0,
	})

	if (!visibleIds.length || !data?.items.length) return null

	// the API returns products in catalog order, so restore the viewing order
	const byId = new Map(data.items.map((product) => [product._id, product]))
	const products = visibleIds.map((id) => byId.get(id)).filter(Boolean)

	return (
		<section className={style.section} aria-labelledby='recently-viewed-title'>
			<h2 id='recently-viewed-title' className={style.title}>
				{t('product.recent')}
			</h2>
			<ul role='list' className={style.grid}>
				{products.map((product) => (
					<li key={product._id}>
						<ProductCard product={product} />
					</li>
				))}
			</ul>
		</section>
	)
}

export default RecentlyViewed
