import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { fetchProducts, productKeys } from '../api/products'
import { lineKey } from './cartLines'
import { findVariant } from '../utils/variants'
import { useCart } from './useCart'

/**
 * Cart lines joined with fresh product data from the API, so prices, titles
 * and stock are always current. Lines of deleted products or removed colors are dropped.
 *
 * @returns `{ items: [{ key, productId, quantity, color, size, product, variant }], isLoading, error }`
 */
export const useCartItems = () => {
	const { lines, removeProducts, setQuantity } = useCart()
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

	const joined = lines.map((line) => {
		const product = productsById.get(line.productId)
		return {
			...line,
			key: lineKey(line),
			product,
			variant: product && findVariant(product, line.color),
		}
	})

	const missingIds = query.isSuccess ? ids.filter((id) => !productsById.has(id)) : []
	const missingKey = missingIds.join(',')
	// lines whose color no longer exists (the product itself still does)
	const orphanKey = query.isSuccess
		? joined
				.filter((item) => item.product && !item.variant)
				.map((item) => item.key)
				.join('\n')
		: ''

	useEffect(() => {
		if (missingKey) removeProducts(missingKey.split(','))
	}, [missingKey, removeProducts])

	useEffect(() => {
		if (orphanKey) orphanKey.split('\n').forEach((key) => setQuantity(key, 0))
	}, [orphanKey, setQuantity])

	const items = joined.filter((item) => item.variant)

	return { items, isLoading: ids.length > 0 && query.isPending, error: query.error }
}
