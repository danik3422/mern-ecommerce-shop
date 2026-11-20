import { useEffect, useState } from 'react'

/** Returns `value` once it has stopped changing for `delayMs`. */
export const useDebouncedValue = (value, delayMs = 200) => {
	const [debounced, setDebounced] = useState(value)

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs)
		return () => clearTimeout(timer)
	}, [value, delayMs])

	return debounced
}
