import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import * as cartApi from '../api/cart'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import { CartProvider } from './CartProvider'
import { useCart } from './useCart'

vi.mock('../api/auth')
vi.mock('../api/cart')

const session = { user: { _id: 'u1', username: 'alice' }, accessToken: 'token' }
const tee = { productId: 'p1', color: 'black', size: 'M', quantity: 1 }
const coat = { productId: 'p2', color: 'blue', size: 'L', quantity: 2 }

/** Minimal UI that drives the providers the way real components do. */
const TestShop = () => {
	const { count, addItem } = useCart()
	const { user, login, logout } = useAuth()
	return (
		<>
			<output aria-label='items in cart'>{count}</output>
			<button onClick={() => addItem(tee)}>Add tee</button>
			{user ? (
				<button onClick={logout}>Sign out</button>
			) : (
				<button onClick={() => login({ login: 'alice', password: 'password123' })}>Sign in</button>
			)}
		</>
	)
}

const renderShop = () =>
	render(
		<AuthProvider>
			<CartProvider>
				<TestShop />
			</CartProvider>
		</AuthProvider>,
	)

const cartCount = () => screen.getByLabelText('items in cart')
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))

describe('CartProvider', () => {
	beforeEach(() => {
		localStorage.clear()
		vi.mocked(authApi.login).mockResolvedValue(session)
		vi.mocked(cartApi.fetchCart).mockResolvedValue([coat])
		vi.mocked(cartApi.saveCart).mockImplementation(async (items) => items)
	})

	it('keeps a guest cart in localStorage without calling the API', () => {
		renderShop()
		click('Add tee')

		expect(cartCount()).toHaveTextContent('1')
		expect(JSON.parse(localStorage.getItem('cart'))).toEqual([tee])
		expect(cartApi.saveCart).not.toHaveBeenCalled()
	})

	it('merges the saved cart on sign-in and saves the result', async () => {
		renderShop()
		click('Add tee')
		click('Sign in')

		await waitFor(() => expect(cartCount()).toHaveTextContent('3'))
		await waitFor(() => expect(cartApi.saveCart).toHaveBeenCalledWith([coat, tee]))
	})

	it('clears the cart on sign-out', async () => {
		renderShop()
		click('Sign in')
		await waitFor(() => expect(cartCount()).toHaveTextContent('2'))

		click('Sign out')

		expect(cartCount()).toHaveTextContent('0')
		expect(JSON.parse(localStorage.getItem('cart'))).toEqual([])
	})
})
