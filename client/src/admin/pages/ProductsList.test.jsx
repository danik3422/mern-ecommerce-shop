import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/admin'
import { makeProduct } from '../../test/fixtures'
import { renderAdmin } from '../testUtils'
import ProductsList from './ProductsList'

vi.mock('../../api/admin', async (importOriginal) => ({
	...(await importOriginal()),
	fetchAdminProducts: vi.fn(),
	fetchProductFilters: vi.fn(),
	duplicateProduct: vi.fn(),
	updateProduct: vi.fn(),
	deleteProduct: vi.fn(),
	bulkUpdateProducts: vi.fn(),
}))

const coat = makeProduct({ _id: 'p1', title: 'Wool Coat', slug: 'wool-coat', price: 100 })
const tee = makeProduct({
	_id: 'p2',
	title: 'Plain Tee',
	slug: 'plain-tee',
	price: 40,
	active: false,
})

beforeEach(() => {
	vi.clearAllMocks()
	api.fetchAdminProducts.mockResolvedValue({ items: [coat, tee], page: 1, pages: 1, total: 2 })
	api.fetchProductFilters.mockResolvedValue({ brands: ['Aster'], categories: ['coats'] })
	api.bulkUpdateProducts.mockResolvedValue({ matched: 2, modified: 2 })
})

const renderList = () =>
	renderAdmin(<ProductsList />, { path: '/admin/products', route: '/admin/products' })

const confirmPopup = async (button) => {
	const dialog = await screen.findByRole('alertdialog')
	fireEvent.click(within(dialog).getByRole('button', { name: button }))
}

describe('ProductsList', () => {
	it('offers actions on every row and opens the editor from the row', async () => {
		renderList()
		const row = (await screen.findByText('Wool Coat')).closest('tr')

		expect(within(row).getByRole('link', { name: 'Edit Wool Coat' })).toHaveAttribute(
			'href',
			'/admin/products/p1',
		)
		expect(within(row).getByRole('link', { name: 'View Wool Coat in the shop' })).toHaveAttribute(
			'href',
			'/product/wool-coat',
		)
		expect(within(row).getByRole('button', { name: 'Hide Wool Coat from the shop' })).toBeEnabled()
		const hiddenRow = screen.getByText('Plain Tee').closest('tr')
		expect(
			within(hiddenRow).getByRole('button', { name: 'Show Plain Tee in the shop' }),
		).toBeEnabled()

		fireEvent.click(row.querySelector('td:nth-child(4)'))
		expect(screen.getByTestId('path')).toHaveTextContent('/admin/products/p1')
	})

	it('duplicates, hides and deletes a product with feedback', async () => {
		api.duplicateProduct.mockResolvedValue({ ...coat, _id: 'p3', title: 'Wool Coat (copy)' })
		api.updateProduct.mockResolvedValue({ ...coat, active: false })
		api.deleteProduct.mockResolvedValue()
		renderList()
		await screen.findByText('Wool Coat')

		fireEvent.click(screen.getByRole('button', { name: 'Duplicate Wool Coat' }))
		expect(
			await screen.findByText(/Copy created \(hidden\): Wool Coat \(copy\)/),
		).toBeInTheDocument()
		expect(api.duplicateProduct).toHaveBeenCalledWith('p1')

		fireEvent.click(screen.getByRole('button', { name: 'Hide Wool Coat from the shop' }))
		await waitFor(() => expect(api.updateProduct).toHaveBeenCalledWith('p1', { active: false }))

		fireEvent.click(screen.getByRole('button', { name: 'Delete Wool Coat' }))
		await confirmPopup('Delete product')
		await waitFor(() => expect(api.deleteProduct).toHaveBeenCalledWith('p1'))
	})

	it('applies bulk actions to the selected products', async () => {
		renderList()
		await screen.findByText('Wool Coat')
		expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('checkbox', { name: 'Select all products on this page' }))
		const bar = screen.getByRole('region', { name: 'Bulk actions' })
		expect(bar).toHaveTextContent('2 selected')

		fireEvent.click(within(bar).getByRole('button', { name: 'Hide' }))
		await waitFor(() =>
			expect(api.bulkUpdateProducts).toHaveBeenCalledWith({ ids: ['p1', 'p2'], action: 'hide' }),
		)

		// one product: discount with a price preview
		fireEvent.click(screen.getByRole('checkbox', { name: 'Select Plain Tee' }))
		expect(bar).toHaveTextContent('1 selected')
		fireEvent.click(within(bar).getByRole('button', { name: 'Set discount' }))
		const dialog = await screen.findByRole('dialog', { name: 'Set discount' })
		fireEvent.change(within(dialog).getByLabelText('Discount (%)'), { target: { value: '25' } })
		expect(within(dialog).getByText(/75/)).toBeInTheDocument()
		fireEvent.click(within(dialog).getByRole('button', { name: 'Apply −25%' }))
		await waitFor(() =>
			expect(api.bulkUpdateProducts).toHaveBeenLastCalledWith({
				ids: ['p1'],
				action: 'discount',
				percent: 25,
			}),
		)

		fireEvent.click(within(bar).getByRole('button', { name: 'Delete' }))
		await confirmPopup('Delete')
		await waitFor(() =>
			expect(api.bulkUpdateProducts).toHaveBeenLastCalledWith({ ids: ['p1'], action: 'delete' }),
		)
	})

	it('edits price and stock in the quick edit drawer', async () => {
		api.updateProduct.mockResolvedValue(coat)
		renderList()
		await screen.findByText('Wool Coat')

		fireEvent.click(screen.getByRole('button', { name: 'Quick edit price and stock of Wool Coat' }))
		const drawer = await screen.findByRole('dialog', { name: 'Quick edit' })
		fireEvent.change(within(drawer).getByLabelText('Price (PLN)'), { target: { value: '90' } })
		fireEvent.change(within(drawer).getByLabelText('Compare-at (PLN)'), { target: { value: '80' } })
		fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))
		// checked before sending
		expect(within(drawer).getByLabelText('Compare-at (PLN)')).toHaveAccessibleDescription(
			'Compare-at price must be higher than the price',
		)
		expect(api.updateProduct).not.toHaveBeenCalled()

		fireEvent.change(within(drawer).getByLabelText('Compare-at (PLN)'), {
			target: { value: '120' },
		})
		fireEvent.change(within(drawer).getByLabelText('Stock of green L'), { target: { value: '7' } })
		fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }))

		await waitFor(() =>
			expect(api.updateProduct).toHaveBeenCalledWith('p1', {
				price: 90,
				compareAtPrice: 120,
				variants: [
					{
						color: 'green',
						images: coat.variants[0].images,
						sizes: [
							{ label: 'M', stock: 0 },
							{ label: 'L', stock: 7 },
						],
					},
				],
			}),
		)
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Quick edit' })).not.toBeInTheDocument(),
		)
	})
})
