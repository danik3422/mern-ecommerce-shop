import { useQuery } from '@tanstack/react-query'
import { fetchBoughtTogether, productKeys } from '../../api/products'

/**
 * Products often bought with this one (`source: 'orders'`), or similar products while there
 * are too few orders (`source: 'related'`). Shared by the bundle and "You may also like".
 */
export const useBoughtTogether = (productId) =>
	useQuery({
		queryKey: productKeys.boughtTogether(productId),
		queryFn: ({ signal }) => fetchBoughtTogether(productId, signal),
		staleTime: 5 * 60_000,
	})
