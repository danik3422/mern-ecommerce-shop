import { useQuery } from '@tanstack/react-query'
import { fetchShopConfig, shopKeys } from '../api/shop'

/** Shop settings (currency, delivery options); loaded once per session. */
export const useShopConfig = () =>
	useQuery({ queryKey: shopKeys.config, queryFn: fetchShopConfig, staleTime: Infinity }).data
