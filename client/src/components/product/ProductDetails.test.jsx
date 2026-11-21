import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthProvider'
import { CartProvider } from '../../cart/CartProvider'
import { I18nProvider } from '../../i18n/I18nProvider'
import { useI18n } from '../../i18n/useI18n'
import { makeProduct } from '../../test/fixtures'
import ProductDetails from './ProductDetails'

// sections that load their own data are not part of this test
vi.mock('../reviews/ProductReviews', () => ({ default: () => null }))
vi.mock('./BoughtTogether', () => ({ default: () => null }))
vi.mock('../../api/shop', async (importOriginal) => ({
	...(await importOriginal()),
	fetchShopConfig: vi.fn(() => new Promise(() => {})),
}))

const SwitchToEnglish = () => {
	const { setLocale } = useI18n()
	return (
		<button type='button' onClick={() => setLocale('en')}>
			English
		</button>
	)
}

const renderProduct = (product) =>
	render(
		<QueryClientProvider client={new QueryClient()}>
			<I18nProvider>
				<AuthProvider>
					<CartProvider>
						<MemoryRouter>
							<SwitchToEnglish />
							<ProductDetails product={product} />
						</MemoryRouter>
					</CartProvider>
				</AuthProvider>
			</I18nProvider>
		</QueryClientProvider>,
	)

describe('ProductDetails description', () => {
	beforeEach(() => {
		localStorage.clear()
		localStorage.setItem('locale', JSON.stringify('pl'))
	})

	it('shows the Polish description in Polish and the English one after switching', () => {
		renderProduct(
			makeProduct({ description: { en: 'Warm wool coat.', pl: 'Ciepły wełniany płaszcz.' } }),
		)
		expect(screen.getByRole('heading', { name: 'Opis' })).toBeInTheDocument()
		expect(screen.getByText('Ciepły wełniany płaszcz.')).toBeInTheDocument()
		expect(screen.queryByText('Warm wool coat.')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'English' }))
		expect(screen.getByText('Warm wool coat.')).toBeInTheDocument()
	})

	it('falls back to English when there is no Polish translation', () => {
		renderProduct(makeProduct({ description: { en: 'Warm wool coat.', pl: '' } }))
		expect(screen.getByText('Warm wool coat.')).toBeInTheDocument()
	})
})
