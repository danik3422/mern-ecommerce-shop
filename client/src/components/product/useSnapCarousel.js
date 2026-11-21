import { useRef, useState } from 'react'

const prefersReducedMotion = () =>
	window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * State of a horizontal CSS scroll-snap track with one slide per "page".
 * The current slide follows native scrolling (swipes, trackpads); `goTo` scrolls
 * to a slide and wraps around at both ends.
 *
 * @returns {{ trackRef, index, goTo: (i: number, options?: { smooth?: boolean }) => void, handleScroll }}
 */
export const useSnapCarousel = (count, startIndex = 0) => {
	const trackRef = useRef(null)
	const [index, setIndex] = useState(startIndex)

	const goTo = (next, { smooth = true } = {}) => {
		const target = (next + count) % count
		setIndex(target)
		const track = trackRef.current
		if (!track) return
		const left = target * track.clientWidth
		const behavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto'
		if (track.scrollTo) track.scrollTo({ left, behavior })
		else track.scrollLeft = left
	}

	const handleScroll = () => {
		const track = trackRef.current
		if (!track?.clientWidth) return
		const visible = Math.round(track.scrollLeft / track.clientWidth)
		setIndex(Math.min(Math.max(visible, 0), count - 1))
	}

	return { trackRef, index, goTo, handleScroll }
}
