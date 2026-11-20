import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchProduct, fetchProducts, productKeys } from '../api/products'

/** @param query `{ category?, color?, size?, sort?, page?, limit? }` */
export const useProducts = (query) =>
	useQuery({
		queryKey: productKeys.list(query),
		queryFn: ({ signal }) => fetchProducts(query, signal),
		placeholderData: keepPreviousData,
	})

export const useProduct = (id) =>
	useQuery({
		queryKey: productKeys.detail(id),
		queryFn: ({ signal }) => fetchProduct(id, signal),
	})
