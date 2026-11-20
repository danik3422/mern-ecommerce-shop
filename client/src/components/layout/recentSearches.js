import { load, save } from '../../utils/storage'

const STORAGE_KEY = 'recentSearches'
const MAX_ITEMS = 5

export const getRecentSearches = () => load(STORAGE_KEY, [])

export const addRecentSearch = (query) => {
	const next = [
		query,
		...getRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase()),
	].slice(0, MAX_ITEMS)
	save(STORAGE_KEY, next)
	return next
}

export const clearRecentSearches = () => save(STORAGE_KEY, [])
