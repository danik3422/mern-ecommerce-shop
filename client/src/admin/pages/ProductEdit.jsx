import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import {
	adminKeys,
	createProduct,
	deleteProduct,
	fetchAdminProduct,
	updateProduct,
} from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import QueryState from '../components/QueryState'
import { productToForm } from '../productForm'

const BackLink = () => (
	<Link to='/admin/products' className='eyebrow'>
		<ArrowLeft size={12} aria-hidden style={{ display: 'inline' }} /> Products
	</Link>
)

/** Invalidates everything that shows products: admin lists and the public catalog. */
const useRefreshProducts = () => {
	const queryClient = useQueryClient()
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: adminKeys.all }),
			queryClient.invalidateQueries({ queryKey: ['products'] }),
		])
}

export const NewProduct = () => {
	const navigate = useNavigate()
	const refresh = useRefreshProducts()
	const create = useMutation({
		mutationFn: createProduct,
		onSuccess: async (product) => {
			await refresh()
			navigate(`/admin/products/${product._id}`, { replace: true })
		},
	})

	return (
		<>
			<PageHeader title='New product' back={<BackLink />} />
			<ProductForm onSubmit={(body) => create.mutate(body)} mutation={create} />
		</>
	)
}

export const EditProduct = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const refresh = useRefreshProducts()

	const product = useQuery({
		queryKey: adminKeys.product(id),
		queryFn: ({ signal }) => fetchAdminProduct(id, signal),
	})
	const update = useMutation({
		mutationFn: (body) => updateProduct(id, body),
		onSuccess: refresh,
	})
	const remove = useMutation({
		mutationFn: () => deleteProduct(id),
		onSuccess: async () => {
			await refresh()
			navigate('/admin/products', { replace: true })
		},
	})

	const handleDelete = () => {
		if (window.confirm(`Delete "${product.data.title}"? This cannot be undone.`)) remove.mutate()
	}

	return (
		<>
			<PageHeader
				title={product.data?.title ?? 'Edit product'}
				back={<BackLink />}
				actions={
					product.data?.active && (
						<Button
							as={Link}
							to={`/product/${product.data.slug}`}
							variant='secondary'
							size='sm'
							target='_blank'
						>
							View in shop <ExternalLink size={14} aria-hidden />
						</Button>
					)
				}
			/>
			{remove.isError && (
				<Alert tone='error'>Could not delete: {getErrorMessage(remove.error)}</Alert>
			)}
			<QueryState query={product} label='the product'>
				{(data) => (
					<ProductForm
						// a fresh form when another product is opened
						key={data._id}
						initialValues={productToForm(data)}
						onSubmit={(body) => update.mutate(body)}
						mutation={update}
						extraActions={
							<Button variant='ghost' onClick={handleDelete} disabled={remove.isPending}>
								{remove.isPending ? 'Deleting…' : 'Delete product'}
							</Button>
						}
					/>
				)}
			</QueryState>
		</>
	)
}
