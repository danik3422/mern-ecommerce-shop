import { Link, useParams } from 'react-router'
import { getErrorMessage } from '../api/client'
import ProductDetails from '../components/product/ProductDetails'
import RecentlyViewed from '../components/product/RecentlyViewed'
import RelatedProducts from '../components/product/RelatedProducts'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProduct } from '../hooks/useProducts'
import style from './Product.module.css'
import { useI18n } from '../i18n/useI18n'

const Product = () => {
	const { t } = useI18n()
	const { id } = useParams()
	const { data: product, error, isPending, isError } = useProduct(id)
	useDocumentTitle(product?.title)

	if (isError) {
		const notFound = [400, 404].includes(error.response?.status)
		return (
			<EmptyState
				title={notFound ? t('product.notFound') : t('product.error')}
				action={
					<Button as={Link} to='/products' variant='secondary'>
						{t('product.backToShop')}
					</Button>
				}
			>
				{notFound ? t('product.notFoundText') : getErrorMessage(error)}
			</EmptyState>
		)
	}

	return (
		<div className={`container ${style.page}`}>
			{isPending ? (
				<div className={style.skeleton} aria-busy='true' aria-label={t('product.loading')} />
			) : (
				<>
					{/* key resets the chosen options and gallery when another product is opened */}
					<ProductDetails product={product} key={product._id} />
					<RelatedProducts productId={product._id} />
					<RecentlyViewed excludeId={product._id} />
				</>
			)}
		</div>
	)
}

export default Product
