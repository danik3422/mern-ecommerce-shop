import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { adminKeys, createProduct, fetchAdminProduct, updateProduct } from '../../api/admin'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast/useToast'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import QueryState from '../components/QueryState'
import StatusBadge from '../components/StatusBadge'
import { productToForm } from '../productForm'
import { useAdminConfirm } from '../useAdminConfirm'
import { useProductActions, useRefreshProducts } from '../useProductActions'
import style from './ProductEdit.module.css'

const BackLink = () => (
	<Link to='/admin/products' className='eyebrow'>
		<ArrowLeft size={12} aria-hidden style={{ display: 'inline' }} /> Products
	</Link>
)

export const NewProduct = () => {
	const navigate = useNavigate()
	const refresh = useRefreshProducts()
	const toast = useToast()
	const create = useMutation({
		mutationFn: createProduct,
		onSuccess: async (product) => {
			await refresh()
			toast.show({ tone: 'success', message: `Created "${product.title}"` })
			navigate(`/admin/products/${product._id}`, { replace: true })
		},
	})

	return (
		<>
			<PageHeader title='New product' back={<BackLink />} />
			<ProductForm onSubmit={(body) => create.mutateAsync(body)} mutation={create} />
		</>
	)
}

/** Header actions of an existing product: view in shop, duplicate, delete. */
const ProductActions = ({ product }) => {
	const navigate = useNavigate()
	const { duplicate, remove } = useProductActions()
	const confirm = useAdminConfirm()

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: 'Delete product?',
			message: `"${product.title}" will be removed from the shop and the admin panel. Past orders keep their copy of it.`,
			confirmLabel: 'Delete product',
			tone: 'danger',
		})
		if (confirmed) {
			remove.mutate(product, {
				onSuccess: () => navigate('/admin/products', { replace: true }),
			})
		}
	}

	return (
		<>
			<StatusBadge status={product.active ? 'active' : 'hidden'} />
			{product.active && (
				<Button
					as='a'
					href={`/product/${product.slug}`}
					target='_blank'
					rel='noreferrer'
					variant='secondary'
					size='sm'
				>
					<ExternalLink size={14} aria-hidden /> View in shop
				</Button>
			)}
			<Button
				variant='secondary'
				size='sm'
				disabled={duplicate.isPending}
				onClick={() => duplicate.mutate(product)}
			>
				<Copy size={14} aria-hidden /> {duplicate.isPending ? 'Duplicating…' : 'Duplicate'}
			</Button>
			<Button
				variant='secondary'
				size='sm'
				className={style.delete}
				disabled={remove.isPending}
				onClick={handleDelete}
			>
				<Trash2 size={14} aria-hidden /> Delete
			</Button>
		</>
	)
}

export const EditProduct = () => {
	const { id } = useParams()
	const refresh = useRefreshProducts()
	const toast = useToast()

	const product = useQuery({
		queryKey: adminKeys.product(id),
		queryFn: ({ signal }) => fetchAdminProduct(id, signal),
	})
	const update = useMutation({
		mutationFn: (body) => updateProduct(id, body),
		onSuccess: async (saved) => {
			await refresh()
			toast.show({ tone: 'success', message: `Saved "${saved.title}"` })
		},
	})

	return (
		<>
			<PageHeader
				title={product.data?.title ?? 'Edit product'}
				description={product.data && 'Change anything below, then save.'}
				back={<BackLink />}
				actions={product.data && <ProductActions product={product.data} />}
			/>
			<QueryState query={product} label='the product'>
				{(data) => (
					<ProductForm
						// a fresh form when another product is opened
						key={data._id}
						initialValues={productToForm(data)}
						onSubmit={(body) => update.mutateAsync(body)}
						mutation={update}
					/>
				)}
			</QueryState>
		</>
	)
}
