import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '../api/client'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

/*
 * A fake API behind the real axios instance: the provider, the interceptors and the
 * single-flight refresh all run as in the browser.
 */
const alice = { _id: 'u1', username: 'alice' }
let server

const reply = (config, status, data) => {
	const response = { data, status, statusText: String(status), headers: {}, config }
	if (status < 400) return response
	throw Object.assign(new Error(`Status ${status}`), { isAxiosError: true, config, response })
}

const fakeApi = async (config) => {
	const { url, method } = config
	server.calls.push(`${method.toUpperCase()} ${url}`)
	if (url === '/auth/refresh') {
		server.refreshes += 1
		if (!server.sessionValid) return reply(config, 401, { message: 'Session expired' })
		server.token = `token-${server.refreshes}`
		return reply(config, 200, { user: alice, accessToken: server.token, expiresIn: 900 })
	}
	if (url === '/auth/logout') return reply(config, 204, '')
	if (url === '/users/me') {
		const sent = config.headers.Authorization
		return sent === `Bearer ${server.token}` ? reply(config, 200, alice) : reply(config, 401, {})
	}
	return reply(config, 404, {})
}

/** Shows the auth state; `useAuthHook` lets a freshly imported provider copy be probed. */
const Probe = ({ useAuthHook = useAuth }) => {
	const { user, isRestoring, logout } = useAuthHook()
	if (isRestoring) return <p>restoring</p>
	return (
		<>
			<p>{user ? `signed in as ${user.username}` : 'signed out'}</p>
			<button onClick={logout}>Sign out</button>
		</>
	)
}

const renderProvider = () =>
	render(
		<AuthProvider>
			<Probe />
		</AuthProvider>,
	)

describe('AuthProvider', () => {
	const originalAdapter = http.defaults.adapter

	beforeEach(() => {
		localStorage.clear()
		server = { calls: [], refreshes: 0, sessionValid: true, token: null }
		http.defaults.adapter = fakeApi
	})
	afterEach(() => {
		http.defaults.adapter = originalAdapter
		vi.useRealTimers()
	})

	it('restores the session from the cookie on start and keeps the token out of storage', async () => {
		localStorage.setItem('signedIn', 'true')
		// a session stored by the old version, token included; removed when the app loads
		localStorage.setItem('session', JSON.stringify({ user: alice, accessToken: 'old' }))
		vi.resetModules()
		const { AuthProvider: FreshProvider } = await import('./AuthProvider')
		const { useAuth: freshUseAuth } = await import('./useAuth')
		const { http: freshHttp } = await import('../api/client')
		freshHttp.defaults.adapter = fakeApi

		render(
			<FreshProvider>
				<Probe useAuthHook={freshUseAuth} />
			</FreshProvider>,
		)
		// protected pages wait instead of redirecting to sign-in
		expect(screen.getByText('restoring')).toBeInTheDocument()
		expect(await screen.findByText('signed in as alice')).toBeInTheDocument()
		expect(server.calls).toEqual(['POST /auth/refresh'])
		expect(localStorage.getItem('session')).toBeNull()
		expect(JSON.stringify({ ...localStorage })).not.toContain('token')
	})

	it('does not call the API for visitors who never signed in', () => {
		renderProvider()
		expect(screen.getByText('signed out')).toBeInTheDocument()
		expect(server.calls).toEqual([])
	})

	it('shows the shop signed out when the session is gone', async () => {
		localStorage.setItem('signedIn', 'true')
		server.sessionValid = false
		renderProvider()
		expect(await screen.findByText('signed out')).toBeInTheDocument()
		expect(localStorage.getItem('signedIn')).toBeNull()
	})

	it('refreshes once for parallel 401s and retries every request', async () => {
		localStorage.setItem('signedIn', 'true')
		renderProvider()
		await screen.findByText('signed in as alice')

		server.token = 'rotated-elsewhere' // the access token in memory is now stale
		const results = await Promise.all([1, 2, 3].map(() => http.get('/users/me')))

		expect(results.map((r) => r.data.username)).toEqual(['alice', 'alice', 'alice'])
		expect(server.refreshes).toBe(2) // start + exactly one for the three failures
	})

	it('signs out when the refresh is refused after a 401', async () => {
		localStorage.setItem('signedIn', 'true')
		renderProvider()
		await screen.findByText('signed in as alice')

		server.token = 'revoked'
		server.sessionValid = false
		await expect(http.get('/users/me')).rejects.toMatchObject({ response: { status: 401 } })
		expect(await screen.findByText('signed out')).toBeInTheDocument()
	})

	it('refreshes the access token shortly before it expires', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
		localStorage.setItem('signedIn', 'true')
		renderProvider()
		await vi.waitFor(() => expect(server.refreshes).toBe(1))

		// expiresIn is 900 s: the next refresh is due one minute early
		await act(() => vi.advanceTimersByTimeAsync(839_000))
		expect(server.refreshes).toBe(1)
		await act(() => vi.advanceTimersByTimeAsync(2_000))
		expect(server.refreshes).toBe(2)
	})

	it('signs out on the server and in the other tabs', async () => {
		localStorage.setItem('signedIn', 'true')
		renderProvider()
		await screen.findByText('signed in as alice')

		const otherTab = new BroadcastChannel('auth')
		const messages = []
		otherTab.onmessage = ({ data }) => messages.push(data)

		fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
		expect(screen.getByText('signed out')).toBeInTheDocument()
		await waitFor(() => expect(server.calls).toContain('POST /auth/logout'))
		await waitFor(() => expect(messages).toEqual([{ type: 'logout' }]))
		otherTab.close()
	})

	it('follows a sign-out in another tab', async () => {
		localStorage.setItem('signedIn', 'true')
		renderProvider()
		await screen.findByText('signed in as alice')

		const otherTab = new BroadcastChannel('auth')
		otherTab.postMessage({ type: 'logout' })
		expect(await screen.findByText('signed out')).toBeInTheDocument()
		otherTab.close()
	})
})
