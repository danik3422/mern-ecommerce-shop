import { Link, useParams } from 'react-router'
import { getErrorMessage } from '../api/client'
import ProductDetails from '../components/product/ProductDetails'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProduct } from '../hooks/useProducts'
import style from './Product.module.css'

const Product = () => {
	const { id } = useParams()
	const { data: product, error, isPending, isError } = useProduct(id)
	useDocumentTitle(product?.title)

	if (isError) {
		const notFound = [400, 404].includes(error.response?.status)
		return (
			<EmptyState
				title={notFound ? 'Product not found' : 'Something went wrong'}
				action={
					<Button as={Link} to='/products' variant='secondary'>
						Back to the shop
					</Button>
				}
			>
				{notFound ? 'It may have been removed or the link is wrong.' : getErrorMessage(error)}
			</EmptyState>
		)
	}

	return (
		<div className={`container ${style.page}`}>
			{isPending ? (
				<div className={style.skeleton} aria-busy='true' aria-label='Loading product' />
			) : (
				// key resets the chosen options when another product is opened
				<ProductDetails product={product} key={product._id} />
			)}
		</div>
	)
}

export default Product
