import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FitBar from './FitBar'
import { fitPosition, suggestedSize } from './sizeFit'

const fit = (counts, verdict, share) => ({
	counts: { small: 0, true: 0, large: 0, ...counts },
	total: Object.values(counts).reduce((sum, n) => sum + n, 0),
	verdict,
	share,
})

describe('FitBar', () => {
	it('shows the verdict, the share behind it and the scale', () => {
		render(<FitBar fit={fit({ small: 7, true: 2, large: 1 }, 'small', 0.7)} />)

		expect(screen.getByText('Runs small')).toBeInTheDocument()
		expect(screen.getByText(/Based on 10 reviews/)).toBeInTheDocument()
		expect(
			screen.getByText('70% of reviewers say it runs small — consider one size up.'),
		).toBeInTheDocument()
		const scale = screen.getByRole('img', {
			name: 'Fit according to reviewers: 7 small, 2 true to size, 1 large',
		})
		// the marker sits on the "small" side
		expect(scale.style.getPropertyValue('--fit-position')).toBe('20%')
	})

	it('says when reviewers disagree', () => {
		render(<FitBar fit={fit({ small: 2, true: 2, large: 1 }, null, 0.4)} />)
		expect(screen.getByText('Mixed opinions on fit')).toBeInTheDocument()
	})

	it('stays hidden with fewer than 3 answers or no data', () => {
		const { container, rerender } = render(<FitBar fit={fit({ small: 2 }, null, 0)} />)
		expect(container).toBeEmptyDOMElement()
		rerender(<FitBar fit={undefined} />)
		expect(container).toBeEmptyDOMElement()
	})
})

describe('size suggestion from the fit', () => {
	const sizes = [
		{ label: 'S', stock: 2 },
		{ label: 'M', stock: 2 },
		{ label: 'L', stock: 0 },
	]

	it('suggests one size up when it runs small and one down when it runs large', () => {
		expect(suggestedSize(sizes, 'S', 'small')).toBe('M')
		expect(suggestedSize(sizes, 'M', 'large')).toBe('S')
	})

	it('suggests nothing when it fits, at the end of the range or when sold out', () => {
		expect(suggestedSize(sizes, 'M', 'true')).toBeNull()
		expect(suggestedSize(sizes, 'S', 'large')).toBeNull()
		expect(suggestedSize(sizes, 'M', 'small')).toBeNull()
		expect(suggestedSize(sizes, null, 'small')).toBeNull()
	})

	it('places the marker between small (0) and large (100)', () => {
		expect(fitPosition({ small: 0, large: 0 }, 4)).toBe(50)
		expect(fitPosition({ small: 4, large: 0 }, 4)).toBe(0)
		expect(fitPosition({ small: 0, large: 2 }, 4)).toBe(75)
	})
})
