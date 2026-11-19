import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { fetchProducts, productKeys } from '../api/products'
import { lineKey } from './cartLines'
import { useCart } from './useCart'

/**
 * Cart lines joined with fresh product data from the API, so prices, titles
 * and stock are always current. Lines of deleted products are removed.
 *
 * @returns `{ items: [{ key, productId, quantity, color, size, product }], isLoading, error }`
 */
export const useCartItems = () => {
	const { lines, removeProducts } = useCart()
	const ids = useMemo(() => [...new Set(lines.map((l) => l.productId))].sort(), [lines])

	const params = { ids: ids.join(','), limit: 100 }
	const query = useQuery({
		queryKey: productKeys.list(params),
		queryFn: ({ signal }) => fetchProducts(params, signal),
		enabled: ids.length > 0,
	})

	const productsById = useMemo(
		() => new Map((query.data?.items ?? []).map((product) => [product._id, product])),
		[query.data],
	)

	const missingIds = query.isSuccess ? ids.filter((id) => !productsById.has(id)) : []
	const missingKey = missingIds.join(',')

	useEffect(() => {
		if (missingKey) removeProducts(missingKey.split(','))
	}, [missingKey, removeProducts])

	const items = lines
		.filter((line) => productsById.has(line.productId))
		.map((line) => ({ ...line, key: lineKey(line), product: productsById.get(line.productId) }))

	return { items, isLoading: ids.length > 0 && query.isPending, error: query.error }
}
