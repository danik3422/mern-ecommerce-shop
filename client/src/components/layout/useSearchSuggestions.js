import { useQuery } from '@tanstack/react-query'
import { fetchFacets, fetchProducts, productKeys } from '../../api/products'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

const MIN_LENGTH = 2
const MAX_PRODUCTS = 5
const MAX_BRANDS = 3

/** Products and brands matching what the visitor is typing (debounced). */
export const useSearchSuggestions = (query) => {
	const term = useDebouncedValue(query.trim())
	const enabled = term.length >= MIN_LENGTH

	const productParams = { q: term, limit: MAX_PRODUCTS }
	const products = useQuery({
		queryKey: productKeys.list(productParams),
		queryFn: ({ signal }) => fetchProducts(productParams, signal),
		enabled,
		staleTime: 60_000,
	})

	// brand facets of the whole catalog, filtered locally by name
	const facets = useQuery({
		queryKey: productKeys.facets({}),
		queryFn: ({ signal }) => fetchFacets({}, signal),
		enabled,
		staleTime: 5 * 60_000,
	})

	const lower = term.toLowerCase()
	const brands = enabled
		? (facets.data?.brands ?? [])
				.filter((brand) => brand.value.toLowerCase().includes(lower))
				.slice(0, MAX_BRANDS)
		: []

	return {
		term,
		isActive: enabled,
		products: enabled ? (products.data?.items ?? []) : [],
		total: products.data?.total ?? 0,
		brands,
		isLoading: enabled && products.isPending,
	}
}
