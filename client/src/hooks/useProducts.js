import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
	fetchFacets,
	fetchProduct,
	fetchProducts,
	fetchRelatedProducts,
	productKeys,
} from '../api/products'

/** @param query API filters, see `fetchProducts` */
export const useProducts = (query) =>
	useQuery({
		queryKey: productKeys.list(query),
		queryFn: ({ signal }) => fetchProducts(query, signal),
		placeholderData: keepPreviousData,
	})

/** @param scope `{ category?, q? }` */
export const useFacets = (scope) =>
	useQuery({
		queryKey: productKeys.facets(scope),
		queryFn: ({ signal }) => fetchFacets(scope, signal),
		placeholderData: keepPreviousData,
		staleTime: 5 * 60_000,
	})

/** @param id product id or slug */
export const useProduct = (id) =>
	useQuery({
		queryKey: productKeys.detail(id),
		queryFn: ({ signal }) => fetchProduct(id, signal),
	})

/** Related products shaped like a product list (`{ items }`), so ProductGrid can render them. */
export const useRelatedProducts = (id, limit = 4) =>
	useQuery({
		queryKey: productKeys.related(id, limit),
		queryFn: ({ signal }) => fetchRelatedProducts(id, limit, signal),
		select: (items) => ({ items }),
	})
