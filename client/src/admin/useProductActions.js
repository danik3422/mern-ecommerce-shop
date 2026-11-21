import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	adminKeys,
	bulkUpdateProducts,
	deleteProduct,
	duplicateProduct,
	updateProduct,
} from '../api/admin'
import { getErrorMessage } from '../api/client'
import { useToast } from '../components/ui/toast/useToast'

/** Invalidates everything that shows products: admin lists and the public catalog. */
export const useRefreshProducts = () => {
	const queryClient = useQueryClient()
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: adminKeys.all }),
			queryClient.invalidateQueries({ queryKey: ['products'] }),
		])
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * Product actions shared by the list and the edit page, each reporting with a toast.
 * Every mutation receives a product (`{ _id, title, active }`), except `bulk`.
 */
export const useProductActions = () => {
	const refresh = useRefreshProducts()
	const toast = useToast()
	const fail = (what) => (error) =>
		toast.show({ tone: 'error', title: `Could not ${what}`, message: getErrorMessage(error) })

	const duplicate = useMutation({
		mutationFn: (product) => duplicateProduct(product._id),
		onSuccess: async (copy) => {
			await refresh()
			toast.show({
				tone: 'success',
				message: `Copy created (hidden): ${copy.title}`,
				action: { label: 'Edit copy', to: `/admin/products/${copy._id}` },
			})
		},
		onError: fail('duplicate the product'),
	})

	const toggleVisibility = useMutation({
		mutationFn: (product) => updateProduct(product._id, { active: !product.active }),
		onSuccess: async (product) => {
			await refresh()
			toast.show({
				tone: 'success',
				message: product.active
					? `"${product.title}" is visible in the shop`
					: `"${product.title}" is hidden`,
			})
		},
		onError: fail('change the visibility'),
	})

	const remove = useMutation({
		mutationFn: (product) => deleteProduct(product._id),
		onSuccess: async (_, product) => {
			await refresh()
			toast.show({ tone: 'success', message: `"${product.title}" deleted` })
		},
		onError: fail('delete the product'),
	})

	const bulk = useMutation({
		mutationFn: (body) => bulkUpdateProducts(body),
		onSuccess: async ({ matched, modified }, { action, percent }) => {
			await refresh()
			const products = plural(matched, 'product')
			const message = {
				show: `${products} visible in the shop`,
				hide: `${products} hidden`,
				delete: `${plural(modified, 'product')} deleted`,
				discount: percent
					? `${percent}% discount set on ${plural(modified, 'product')}`
					: `Sale ended for ${plural(modified, 'product')}`,
			}[action]
			toast.show({ tone: 'success', message })
		},
		onError: fail('update the products'),
	})

	return { duplicate, toggleVisibility, remove, bulk }
}
