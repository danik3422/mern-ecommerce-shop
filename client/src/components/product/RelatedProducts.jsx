import { useQuery } from '@tanstack/react-query'
import { fetchRelatedProducts, productKeys } from '../../api/products'
import ProductGrid from './ProductGrid'
import style from './RelatedProducts.module.css'
import { useBoughtTogether } from './useBoughtTogether'
import { useI18n } from '../../i18n/useI18n'

/**
 * "You may also like" — similar products; hidden when there are none.
 * While a product has too few orders for "Frequently bought together", the bought-together
 * endpoint already returns similar products, so they are shown here. Otherwise products from the
 * same categories are shown, minus those in the bundle section above.
 */
const RelatedProducts = ({ productId, limit = 4 }) => {
	const { t } = useI18n()
	const together = useBoughtTogether(productId)
	const fromOrders = together.data?.source === 'orders'
	// extra items make up for those already shown in "Frequently bought together"
	const relatedLimit = limit + 4
	const related = useQuery({
		queryKey: productKeys.related(productId, relatedLimit),
		queryFn: ({ signal }) => fetchRelatedProducts(productId, relatedLimit, signal),
		enabled: fromOrders,
	})

	let query = together
	if (together.isSuccess) {
		if (fromOrders) {
			const shown = new Set(together.data.items.map((item) => item._id))
			query = {
				...related,
				data: related.data && {
					items: related.data.filter((item) => !shown.has(item._id)).slice(0, limit),
				},
			}
		} else {
			query = { ...together, data: { items: together.data.items.slice(0, limit) } }
		}
	}
	if (query.isSuccess && !query.data.items.length) return null

	return (
		<section className={style.related} aria-labelledby='related-title'>
			<h2 id='related-title' className={style.title}>
				{t('product.related')}
			</h2>
			<ProductGrid query={query} skeletonCount={limit} />
		</section>
	)
}

export default RelatedProducts
