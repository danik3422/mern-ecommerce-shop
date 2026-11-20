import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ProductGallery from './ProductGallery'

const images = ['/a.jpg', '/b.jpg', '/c.jpg']

const mainImage = () => screen.getByRole('img', { name: /coat, image/i })

describe('ProductGallery', () => {
	it('switches the main image with thumbnails', () => {
		render(<ProductGallery images={images} title='Coat' />)

		expect(mainImage()).toHaveAttribute('src', '/a.jpg')
		fireEvent.click(screen.getByRole('button', { name: 'Show image 3 of 3' }))

		expect(mainImage()).toHaveAttribute('src', '/c.jpg')
		expect(screen.getByRole('button', { name: 'Show image 3 of 3' })).toHaveAttribute(
			'aria-current',
			'true',
		)
	})

	it('supports arrow keys and wraps around', () => {
		render(<ProductGallery images={images} title='Coat' />)
		const viewer = screen.getByRole('group', { name: /image 1 of 3/i })

		fireEvent.keyDown(viewer, { key: 'ArrowLeft' })
		expect(mainImage()).toHaveAttribute('src', '/c.jpg')

		fireEvent.keyDown(viewer, { key: 'ArrowRight' })
		expect(mainImage()).toHaveAttribute('src', '/a.jpg')

		fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
		expect(mainImage()).toHaveAttribute('src', '/b.jpg')
	})

	it('shows a single image without controls', () => {
		render(<ProductGallery images={['/a.jpg']} title='Coat' />)
		expect(screen.getByRole('img', { name: 'Coat' })).toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
