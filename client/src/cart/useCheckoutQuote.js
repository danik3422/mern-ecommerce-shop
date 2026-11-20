import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchQuote, shopKeys } from '../api/shop'
import { toApiItems } from './cartLines'

/** Server-calculated totals for the bag, delivery method and promo code. */
export const useCheckoutQuote = ({ lines, shippingMethod, promoCode }) => {
	const body = { items: toApiItems(lines), shippingMethod, promoCode: promoCode || undefined }
	return useQuery({
		queryKey: shopKeys.quote(body),
		queryFn: ({ signal }) => fetchQuote(body, signal),
		enabled: lines.length > 0,
		placeholderData: keepPreviousData,
		retry: false,
	})
}
