import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { getErrorMessage } from '../api/client'
import { fetchProduct, productKeys } from '../api/products'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import ProductDetails from '../components/ProductDetails/ProductDetails'

const Product = () => {
	const { id } = useParams()
	const {
		data: product,
		error,
		isPending,
		isError,
	} = useQuery({
		queryKey: productKeys.detail(id),
		queryFn: ({ signal }) => fetchProduct(id, signal),
	})

	return (
		<>
			<Navbar />
			{isPending && <div className='status-page'>Loading…</div>}
			{isError && (
				<div className='status-page'>Could not load the product: {getErrorMessage(error)}</div>
			)}
			{/* key resets the chosen options when another product is opened */}
			{product && <ProductDetails product={product} key={product._id} />}
			<Footer />
		</>
	)
}

export default Product
