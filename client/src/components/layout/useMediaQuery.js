import { useSyncExternalStore } from 'react'

/** `true` while the CSS media query matches; `false` where matchMedia is missing (tests). */
export const useMediaQuery = (query) =>
	useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia?.(query)
			list?.addEventListener('change', onChange)
			return () => list?.removeEventListener('change', onChange)
		},
		() => window.matchMedia?.(query).matches ?? false,
	)
