import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ProductGallery from './ProductGallery'

const images = ['/a.jpg', '/b.jpg', '/c.jpg']

const thumbnail = (n) => screen.getByRole('button', { name: `Show image ${n} of 3` })
const position = () => screen.getByText(/^Image \d of \d$/).textContent
const track = () => screen.getByRole('group', { name: /use the arrow keys/i })

describe('ProductGallery', () => {
	it('renders every photo with alt text in a labelled region', () => {
		render(<ProductGallery images={images} title='Coat' />)

		expect(screen.getByRole('region', { name: 'Coat images' })).toBeInTheDocument()
		expect(screen.getByRole('img', { name: 'Coat, image 1' })).toHaveAttribute('src', '/a.jpg')
		expect(screen.getByRole('img', { name: 'Coat, image 3' })).toHaveAttribute('src', '/c.jpg')
		expect(position()).toBe('Image 1 of 3')
	})

	it('marks the chosen thumbnail as current', () => {
		render(<ProductGallery images={images} title='Coat' />)
		expect(thumbnail(1)).toHaveAttribute('aria-current', 'true')

		fireEvent.click(thumbnail(3))

		expect(thumbnail(3)).toHaveAttribute('aria-current', 'true')
		expect(thumbnail(1)).toHaveAttribute('aria-current', 'false')
		expect(position()).toBe('Image 3 of 3')
	})

	it('switches photos with the next / previous buttons and wraps around', () => {
		render(<ProductGallery images={images} title='Coat' />)

		fireEvent.click(screen.getByRole('button', { name: 'Previous image' }))
		expect(position()).toBe('Image 3 of 3')

		fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
		fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
		expect(position()).toBe('Image 2 of 3')
	})

	it('supports arrow keys when the gallery has focus', () => {
		render(<ProductGallery images={images} title='Coat' />)

		fireEvent.keyDown(track(), { key: 'ArrowLeft' })
		expect(position()).toBe('Image 3 of 3')

		fireEvent.keyDown(track(), { key: 'ArrowRight' })
		expect(position()).toBe('Image 1 of 3')
		expect(track()).toHaveAccessibleName(/image 1 of 3/i)
	})

	it('shows a single image without navigation controls', () => {
		render(<ProductGallery images={['/a.jpg']} title='Coat' />)
		expect(screen.getByRole('img', { name: 'Coat' })).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /previous|next|show image/i }),
		).not.toBeInTheDocument()
	})

	it('opens the viewer on the clicked photo, switches with the keyboard and closes on Escape', () => {
		render(<ProductGallery images={images} title='Coat' />)
		fireEvent.click(screen.getByRole('img', { name: 'Coat, image 2' }))

		const dialog = screen.getByRole('dialog', { name: 'Coat — image 2 of 3' })
		fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Zoom in' }), {
			key: 'ArrowRight',
		})
		expect(screen.getByRole('dialog', { name: 'Coat — image 3 of 3' })).toBeInTheDocument()

		fireEvent.keyDown(document, { key: 'Escape' })
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		// the gallery follows the photo the viewer was closed on
		expect(position()).toBe('Image 3 of 3')
	})

	it('opens the viewer from the full-screen button with thumbnails and a zoom toggle', () => {
		render(<ProductGallery images={images} title='Coat' />)
		fireEvent.click(screen.getByRole('button', { name: 'Open images in full screen' }))

		const dialog = screen.getByRole('dialog', { name: 'Coat — image 1 of 3' })
		fireEvent.click(within(dialog).getByRole('button', { name: 'Show image 3 of 3' }))
		expect(dialog).toHaveAccessibleName('Coat — image 3 of 3')

		fireEvent.click(within(dialog).getByRole('button', { name: 'Zoom in' }))
		expect(within(dialog).getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()

		// another photo starts unzoomed
		fireEvent.click(within(dialog).getByRole('button', { name: 'Previous image' }))
		expect(within(dialog).getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()

		fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
