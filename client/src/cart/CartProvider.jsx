import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCart, saveCart } from '../api/cart'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { load, save } from '../utils/storage'
import * as cartLines from './cartLines'
import { CartContext } from './CartContext'

const STORAGE_KEY = 'cart'
const SAVE_DELAY_MS = 400

/**
 * Keeps the cart in localStorage for guests and on the server for signed-in users:
 * - on sign-in the saved cart is merged with the local one;
 * - while signed in, every change is saved to the server (debounced);
 * - on sign-out the cart is cleared, so it does not stay on a shared device.
 */
export const CartProvider = ({ children }) => {
	const { user } = useAuth()
	const userId = user?._id ?? null

	const [lines, setLines] = useState(() => load(STORAGE_KEY, []))
	const [ownerId, setOwnerId] = useState(userId)
	// id of the user whose saved cart is already merged into `lines`
	const [syncedUserId, setSyncedUserId] = useState(null)

	// React to sign-in/sign-out during render instead of in an effect:
	// https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
	if (ownerId !== userId) {
		setOwnerId(userId)
		setSyncedUserId(null)
		if (!userId) setLines([])
	}

	useEffect(() => save(STORAGE_KEY, lines), [lines])

	useEffect(() => {
		if (!userId || syncedUserId === userId) return
		let cancelled = false

		fetchCart()
			.then((savedLines) => {
				if (cancelled) return
				setLines((localLines) => cartLines.mergeLines(savedLines, localLines))
				setSyncedUserId(userId)
			})
			// the local cart keeps working; syncing is retried after the next sign-in
			.catch((error) => console.warn('Could not load the saved cart:', getErrorMessage(error)))

		return () => {
			cancelled = true
		}
	}, [userId, syncedUserId])

	useEffect(() => {
		if (!userId || syncedUserId !== userId) return
		const timer = setTimeout(() => {
			saveCart(cartLines.toApiItems(lines)).catch((error) =>
				console.warn('Could not save the cart:', getErrorMessage(error)),
			)
		}, SAVE_DELAY_MS)
		return () => clearTimeout(timer)
	}, [lines, userId, syncedUserId])

	/** @param stock available quantity of the size: the bag never holds more */
	const addItem = useCallback(
		(line, stock) => setLines((prev) => cartLines.addLine(prev, line, stock)),
		[],
	)

	const quantityInBag = useCallback((line) => cartLines.quantityInLines(lines, line), [lines])

	const setQuantity = useCallback(
		(key, quantity) => setLines((prev) => cartLines.setLineQuantity(prev, key, quantity)),
		[],
	)

	const removeProducts = useCallback(
		(productIds) => setLines((prev) => cartLines.removeProducts(prev, productIds)),
		[],
	)

	const clear = useCallback(() => setLines([]), [])

	const value = useMemo(
		() => ({
			lines,
			count: cartLines.countItems(lines),
			addItem,
			quantityInBag,
			setQuantity,
			removeProducts,
			clear,
		}),
		[lines, addItem, quantityInBag, setQuantity, removeProducts, clear],
	)

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
