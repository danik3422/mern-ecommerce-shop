import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../account/test-utils'
import ProductCard from './ProductCard'
import { makeProduct } from '../../test/fixtures'

const coat = makeProduct({
	title: 'Wool Coat',
	slug: 'wool-coat',
	price: 300,
	compareAtPrice: 400,
	variants: [
		{ color: 'gray', images: ['/gray-1.jpg'], sizes: [{ label: 'M', stock: 0 }] },
		{
			color: 'black',
			images: ['/b-1.jpg', '/b-2.jpg', '/b-3.jpg'],
			sizes: [{ label: 'M', stock: 9 }],
		},
	],
})

/** The photo currently shown (the others are faded out or scrolled away). */
const shownPhoto = (container) => container.querySelector('[data-active] img')

describe('ProductCard', () => {
	it('is one link to the product, with buttons outside the link', () => {
		renderWithProviders(<ProductCard product={coat} />)
		const link = screen.getByRole('link', { name: /Wool Coat/ })
		expect(link).toHaveAttribute('href', '/product/wool-coat')
		expect(link).toHaveTextContent('−25%')
		for (const button of screen.getAllByRole('button')) expect(button.closest('a')).toBeNull()
	})

	it('shows photos of the first color in stock and browses them', () => {
		const { container } = renderWithProviders(<ProductCard product={coat} />)
		expect(shownPhoto(container)).toHaveAttribute('src', '/b-1.jpg')

		fireEvent.click(screen.getByRole('button', { name: 'Next photo of Wool Coat' }))
		expect(shownPhoto(container)).toHaveAttribute('src', '/b-2.jpg')

		fireEvent.click(screen.getByRole('button', { name: 'Previous photo of Wool Coat' }))
		fireEvent.click(screen.getByRole('button', { name: 'Previous photo of Wool Coat' }))
		expect(shownPhoto(container)).toHaveAttribute('src', '/b-3.jpg')
	})

	it('shows the second photo while hovered with a mouse', () => {
		const { container } = renderWithProviders(<ProductCard product={coat} />)
		const media = shownPhoto(container).closest('a').parentElement
		fireEvent.pointerEnter(media, { pointerType: 'mouse' })
		expect(shownPhoto(container)).toHaveAttribute('src', '/b-2.jpg')
		fireEvent.pointerLeave(media, { pointerType: 'mouse' })
		expect(shownPhoto(container)).toHaveAttribute('src', '/b-1.jpg')
	})

	it('shows badges, color names and a placeholder without photos', () => {
		const { container } = renderWithProviders(
			<ProductCard
				product={makeProduct({
					images: [],
					colors: ['white', 'black'],
					sizes: [{ label: 'M', stock: 1 }],
					compareAtPrice: 200,
				})}
			/>,
		)
		expect(screen.getByText('Sale')).toBeInTheDocument()
		expect(screen.getByText('Only a few left')).toBeInTheDocument()
		expect(screen.getByText('2 colors: White, Black')).toBeInTheDocument()
		expect(container.querySelector('img')).toBeNull()
	})
})
