import { useRelatedProducts } from '../../hooks/useProducts'
import ProductGrid from './ProductGrid'
import style from './RelatedProducts.module.css'
import { useI18n } from '../../i18n/useI18n'

/** "You may also like" — products from the same categories; hidden when there are none. */
const RelatedProducts = ({ productId, limit = 4 }) => {
	const { t } = useI18n()
	const related = useRelatedProducts(productId, limit)
	if (related.isSuccess && !related.data.items.length) return null

	return (
		<section className={style.related} aria-labelledby='related-title'>
			<h2 id='related-title' className={style.title}>
				{t('product.related')}
			</h2>
			<ProductGrid query={related} skeletonCount={limit} />
		</section>
	)
}

export default RelatedProducts
