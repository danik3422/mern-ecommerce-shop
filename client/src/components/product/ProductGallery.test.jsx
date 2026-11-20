import { fireEvent, render, screen, within } from '@testing-library/react'
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

	it('shows a single image without navigation controls', () => {
		render(<ProductGallery images={['/a.jpg']} title='Coat' />)
		expect(screen.getByRole('img', { name: 'Coat' })).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /previous|next|show image/i }),
		).not.toBeInTheDocument()
	})

	it('opens the full-screen viewer and switches images with the keyboard', () => {
		render(<ProductGallery images={['/a.jpg', '/b.jpg']} title='Coat' />)
		fireEvent.click(screen.getByRole('button', { name: 'Open images in full screen' }))

		const dialog = screen.getByRole('dialog', { name: 'Coat — image 1 of 2' })
		fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Zoom in' }), {
			key: 'ArrowRight',
		})
		expect(screen.getByRole('dialog', { name: 'Coat — image 2 of 2' })).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
