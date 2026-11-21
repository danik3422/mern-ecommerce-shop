import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProductForm from './ProductForm'

const idle = { isPending: false, isError: false, isSuccess: false, error: null }

/** An axios-like error as returned by the API for invalid fields. */
const validationError = (details) => ({
	...idle,
	isError: true,
	error: { response: { status: 400, data: { message: 'Validation failed', details } } },
})

const renderForm = (props = {}) => {
	const onSubmit = vi.fn()
	render(<ProductForm onSubmit={onSubmit} mutation={idle} {...props} />)
	return { onSubmit }
}

const sizeRows = () => {
	const table = screen.getByRole('group', { name: 'Sizes and stock' })
	return within(table).getAllByRole('textbox', { name: /^Size \d+ label$/ })
}

describe('ProductForm', () => {
	it('suggests a slug from the title until the slug is edited', () => {
		renderForm()
		const title = screen.getByLabelText('Title')
		const slug = screen.getByLabelText('URL slug')

		fireEvent.change(title, { target: { value: 'Summer Linen Shirt' } })
		expect(slug).toHaveValue('summer-linen-shirt')

		fireEvent.change(slug, { target: { value: 'linen-shirt' } })
		fireEvent.change(title, { target: { value: 'Summer Linen Shirt 2' } })
		expect(slug).toHaveValue('linen-shirt')
	})

	it('edits sizes: presets, add and remove rows, at least one row stays', () => {
		renderForm()
		expect(sizeRows().map((input) => input.value)).toEqual(['XS', 'S', 'M', 'L', 'XL'])

		fireEvent.click(screen.getByRole('button', { name: 'One size' }))
		expect(sizeRows().map((input) => input.value)).toEqual(['One size'])
		expect(screen.getByRole('button', { name: 'Remove size One size' })).toBeDisabled()

		fireEvent.click(screen.getByRole('button', { name: 'Add size' }))
		fireEvent.change(sizeRows()[1], { target: { value: 'XXL' } })
		fireEvent.change(screen.getByLabelText('Stock of size XXL'), { target: { value: '7' } })
		expect(sizeRows()).toHaveLength(2)

		fireEvent.click(screen.getByRole('button', { name: 'Remove size One size' }))
		expect(sizeRows().map((input) => input.value)).toEqual(['XXL'])
	})

	it('submits typed values with numbers converted', () => {
		const { onSubmit } = renderForm()
		fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Tee' } })
		fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Northline' } })
		fireEvent.change(screen.getByLabelText('Description (English)'), { target: { value: 'Soft' } })
		fireEvent.change(screen.getByLabelText('Price (PLN)'), { target: { value: '25' } })
		fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'Indigo' } })
		fireEvent.click(screen.getByRole('button', { name: 'Jeans 28–34' }))
		fireEvent.change(screen.getByLabelText('Stock of size 30'), { target: { value: '4' } })

		const categories = screen.getByLabelText('Categories')
		fireEvent.change(categories, { target: { value: 'Women' } })
		fireEvent.keyDown(categories, { key: 'Enter' })

		fireEvent.click(screen.getByRole('button', { name: 'Create product' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Tee',
				slug: 'tee',
				brand: 'Northline',
				description: { en: 'Soft', pl: '' },
				price: 25,
				categories: ['women'],
				variants: [
					{
						color: 'indigo',
						images: [],
						sizes: [
							{ label: '28', stock: 0 },
							{ label: '30', stock: 4 },
							{ label: '32', stock: 0 },
							{ label: '34', stock: 0 },
						],
					},
				],
				active: true,
			}),
		)
		expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('compareAtPrice')
	})

	it('shows server validation errors next to the fields', () => {
		renderForm({
			mutation: validationError([
				{ path: 'title', message: 'Title is required' },
				{ path: 'variants.0.sizes.1.label', message: 'Size labels must be unique' },
				{ path: 'compareAtPrice', message: 'Compare-at price must be higher than the price' },
			]),
		})

		expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Title is required')
		expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
		expect(sizeRows()[1]).toHaveAttribute('aria-invalid', 'true')
		expect(screen.getByText('Size labels must be unique')).toBeInTheDocument()
		expect(screen.getByLabelText('Compare-at price (PLN)')).toHaveAccessibleDescription(
			'Compare-at price must be higher than the price',
		)
		expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.')
	})

	it('shows errors that do not belong to a field as a message', () => {
		renderForm({
			mutation: {
				...idle,
				isError: true,
				error: { response: { status: 409, data: { message: 'This slug is already taken' } } },
			},
		})
		expect(screen.getByRole('alert')).toHaveTextContent('This slug is already taken')
	})

	it('reorders and removes images', () => {
		renderForm({
			initialValues: {
				title: 'Coat',
				slug: 'coat',
				brand: 'Aster',
				description: { en: 'Warm', pl: '' },
				price: '10',
				compareAtPrice: '',
				categories: [],
				variants: [
					{
						key: 'v1',
						color: 'black',
						images: ['/a.jpg', '/b.jpg'],
						sizes: [{ label: 'M', stock: '1' }],
					},
				],
				active: true,
			},
		})
		const sources = () => screen.getAllByRole('img').map((img) => img.getAttribute('src'))

		fireEvent.click(screen.getByRole('button', { name: 'Move image 2 left' }))
		expect(sources()).toEqual(['/b.jpg', '/a.jpg'])

		fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))
		expect(sources()).toEqual(['/a.jpg'])

		const url = screen.getByLabelText('Image URL or path')
		fireEvent.change(url, { target: { value: 'not a url' } })
		fireEvent.click(screen.getByRole('button', { name: 'Add' }))
		expect(screen.getByText(/Enter a full URL/)).toBeInTheDocument()

		fireEvent.change(url, { target: { value: '/uploads/c.png' } })
		fireEvent.click(screen.getByRole('button', { name: 'Add' }))
		expect(sources()).toEqual(['/a.jpg', '/uploads/c.png'])
	})

	it('adds a color with the same sizes and removes it again', () => {
		renderForm()
		fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'black' } })
		fireEvent.click(screen.getByRole('button', { name: 'Add color' }))

		const colors = screen.getAllByLabelText('Color')
		expect(colors).toHaveLength(2)
		fireEvent.change(colors[1], { target: { value: 'white' } })
		expect(screen.getByRole('region', { name: 'Color: white' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Remove color white' }))
		expect(screen.getAllByLabelText('Color')).toHaveLength(1)
		// the last color cannot be removed
		expect(screen.queryByRole('button', { name: /Remove color/ })).not.toBeInTheDocument()
	})

	describe('description in English and Polish', () => {
		const coat = {
			title: 'Coat',
			slug: 'coat',
			brand: 'Aster',
			description: { en: 'Warm wool coat.', pl: '' },
			price: '10',
			compareAtPrice: '',
			categories: [],
			variants: [{ key: 'v1', color: 'black', images: [], sizes: [{ label: 'M', stock: '1' }] }],
			active: true,
		}

		it('edits each language in its own tab and flags the missing Polish text', () => {
			const { onSubmit } = renderForm({ initialValues: coat })
			const english = screen.getByRole('tab', { name: /English/ })
			const polish = screen.getByRole('tab', { name: /Polish/ })
			expect(english).toHaveAttribute('aria-selected', 'true')
			expect(polish).toHaveAccessibleName('Polish, missing translation')
			expect(screen.getByRole('note')).toHaveTextContent('Missing Polish translation')
			expect(screen.getByLabelText('Description (English)')).toHaveValue('Warm wool coat.')

			fireEvent.click(polish)
			expect(polish).toHaveAttribute('aria-selected', 'true')
			fireEvent.change(screen.getByLabelText('Description (Polish)'), {
				target: { value: 'Ciepły wełniany płaszcz.' },
			})
			expect(polish).toHaveAccessibleName('Polish')
			expect(screen.queryByRole('note')).not.toBeInTheDocument()

			// switching back keeps what was typed in each language
			fireEvent.click(english)
			expect(screen.getByLabelText('Description (English)')).toHaveValue('Warm wool coat.')

			fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
			expect(onSubmit.mock.calls[0][0].description).toEqual({
				en: 'Warm wool coat.',
				pl: 'Ciepły wełniany płaszcz.',
			})
		})

		it('shows the preview in the language of the open tab, falling back to English', () => {
			renderForm({ initialValues: coat })
			const preview = screen.getByRole('region', { name: 'Preview' })
			expect(within(preview).getByText('Warm wool coat.')).toBeInTheDocument()

			fireEvent.click(within(preview).getByRole('button', { name: 'PL' }))
			expect(screen.getByRole('tab', { name: /Polish/ })).toHaveAttribute('aria-selected', 'true')
			expect(within(preview).getByText(/no Polish translation yet/)).toBeInTheDocument()

			fireEvent.change(screen.getByLabelText('Description (Polish)'), {
				target: { value: 'Ciepły płaszcz.' },
			})
			expect(within(preview).getByText('Ciepły płaszcz.')).toBeInTheDocument()
			expect(within(preview).queryByText(/no Polish translation yet/)).not.toBeInTheDocument()
		})

		it('opens the English tab when the English description is missing on save', () => {
			const { onSubmit } = renderForm({
				initialValues: { ...coat, description: { en: '', pl: 'Tylko po polsku' } },
			})
			fireEvent.click(screen.getByRole('tab', { name: /Polish/ }))
			fireEvent.change(screen.getByLabelText('Description (Polish)'), {
				target: { value: 'Tylko po polsku!' },
			})
			fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

			expect(onSubmit).not.toHaveBeenCalled()
			expect(screen.getByRole('tab', { name: /English/ })).toHaveAttribute('aria-selected', 'true')
			expect(screen.getByLabelText('Description (English)')).toHaveAccessibleDescription(
				'Enter the English description',
			)
		})
	})
})
