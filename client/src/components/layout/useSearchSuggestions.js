import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchSearchSuggestions, productKeys } from '../../api/products'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

const MIN_LENGTH = 2
const MAX_PRODUCTS = 5

/**
 * Products, brands and categories matching what the visitor is typing (debounced).
 * The search is typo tolerant: `correctedQuery` is set when the matches are for a corrected
 * spelling ("nortlin" → "northline").
 */
export const useSearchSuggestions = (query) => {
	const term = useDebouncedValue(query.trim())
	const enabled = term.length >= MIN_LENGTH

	const suggestions = useQuery({
		queryKey: productKeys.suggestions(term, MAX_PRODUCTS),
		queryFn: ({ signal }) => fetchSearchSuggestions(term, MAX_PRODUCTS, signal),
		enabled,
		staleTime: 60_000,
		// keep the previous matches on screen while the next ones load
		placeholderData: keepPreviousData,
	})
	const data = enabled ? suggestions.data : undefined

	return {
		term,
		isActive: enabled,
		products: data?.products ?? [],
		total: data?.total ?? 0,
		brands: data?.brands ?? [],
		categories: data?.categories ?? [],
		correctedQuery: data?.correctedQuery ?? null,
		isLoading: enabled && suggestions.isPending,
	}
}
