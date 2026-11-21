import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/admin'
import { makeProduct } from '../../test/fixtures'
import { renderAdmin } from '../testUtils'
import { EditProduct } from './ProductEdit'

vi.mock('../../api/admin', async (importOriginal) => ({
	...(await importOriginal()),
	fetchAdminProduct: vi.fn(),
	updateProduct: vi.fn(),
	deleteProduct: vi.fn(),
}))

const coat = makeProduct({ _id: 'p1', title: 'Wool Coat', price: 100 })

beforeEach(() => {
	vi.clearAllMocks()
	api.fetchAdminProduct.mockResolvedValue(coat)
})

const renderEdit = () =>
	renderAdmin(<EditProduct />, { path: '/admin/products/p1', route: '/admin/products/:id' })

describe('EditProduct', () => {
	it('tracks unsaved changes, saves them and stays on the page', async () => {
		api.updateProduct.mockImplementation(async (_id, body) => ({ ...coat, ...body }))
		renderEdit()
		const price = await screen.findByLabelText('Price (PLN)')
		const save = screen.getByRole('button', { name: 'Save changes' })
		expect(screen.getByText('All changes saved')).toBeInTheDocument()
		expect(save).toBeDisabled()

		fireEvent.change(price, { target: { value: '89.5' } })
		expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
		fireEvent.click(save)

		await waitFor(() =>
			expect(api.updateProduct).toHaveBeenCalledWith(
				'p1',
				expect.objectContaining({ price: 89.5, title: 'Wool Coat', compareAtPrice: null }),
			),
		)
		expect(await screen.findByText('Saved "Wool Coat"')).toBeInTheDocument()
		expect(await screen.findByText('All changes saved')).toBeInTheDocument()
		expect(screen.getByLabelText('Price (PLN)')).toHaveValue(89.5)
		expect(screen.getByTestId('path')).toHaveTextContent('/admin/products/p1')
	})

	it('discards changes and checks fields before saving', async () => {
		renderEdit()
		const title = await screen.findByLabelText('Title')

		fireEvent.change(title, { target: { value: '' } })
		fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
		expect(title).toHaveAccessibleDescription('Enter a title')
		expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.')
		expect(api.updateProduct).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
		expect(title).toHaveValue('Wool Coat')
		expect(screen.getByText('All changes saved')).toBeInTheDocument()
	})

	it('asks before deleting', async () => {
		api.deleteProduct.mockResolvedValue()
		renderEdit()
		fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
		const dialog = await screen.findByRole('alertdialog', { name: 'Delete product?' })
		fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
		expect(api.deleteProduct).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
		fireEvent.click(
			within(await screen.findByRole('alertdialog')).getByRole('button', {
				name: 'Delete product',
			}),
		)
		await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/admin/products'))
		expect(api.deleteProduct).toHaveBeenCalledWith('p1')
	})
})
