import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys, addToWishlist, fetchWishlistIds, removeFromWishlist } from '../../api/account'
import { useAuth } from '../../auth/useAuth'

/**
 * Wishlist state of one product for the signed-in user.
 * Toggling is optimistic: the heart changes at once and rolls back if the request fails.
 */
export const useWishlist = (productId) => {
	const { user } = useAuth()
	const queryClient = useQueryClient()
	const idsKey = [...accountKeys.wishlistIds, user?._id]

	const ids = useQuery({
		queryKey: idsKey,
		queryFn: fetchWishlistIds,
		enabled: Boolean(user),
		staleTime: 5 * 60_000,
	})

	const mutation = useMutation({
		mutationFn: (save) => (save ? addToWishlist(productId) : removeFromWishlist(productId)),
		onMutate: async (save) => {
			await queryClient.cancelQueries({ queryKey: idsKey })
			const previous = queryClient.getQueryData(idsKey)
			queryClient.setQueryData(idsKey, (current = []) =>
				save ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
			)
			return { previous }
		},
		onError: (_error, _save, context) => queryClient.setQueryData(idsKey, context?.previous),
		onSuccess: (savedIds) => queryClient.setQueryData(idsKey, savedIds),
		// refresh the wishlist page; the ids are already up to date
		onSettled: () =>
			queryClient.invalidateQueries({
				queryKey: [...accountKeys.wishlist, user?._id],
				exact: true,
			}),
	})

	const isSaved = ids.data?.includes(productId) ?? false

	return {
		isSaved,
		isSignedIn: Boolean(user),
		toggle: () => mutation.mutate(!isSaved),
		isError: mutation.isError,
	}
}
