import { useSyncExternalStore } from 'react'
import { load, save } from '../utils/storage'

const STORAGE_KEY = 'recentlyViewed'
const MAX_ITEMS = 12
const listeners = new Set()

const read = () => load(STORAGE_KEY, [])
// useSyncExternalStore needs a stable snapshot between changes
let snapshot = read()

const subscribe = (listener) => {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

/** Records a product id as the most recently viewed one. */
export const rememberViewedProduct = (productId) => {
	const next = [productId, ...read().filter((id) => id !== productId)].slice(0, MAX_ITEMS)
	save(STORAGE_KEY, next)
	snapshot = next
	listeners.forEach((listener) => listener())
}

/** Ids of recently viewed products, newest first (stored in this browser only). */
export const useRecentlyViewed = () => {
	const ids = useSyncExternalStore(subscribe, () => snapshot)
	return { ids, remember: rememberViewedProduct }
}
