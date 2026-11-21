import { http } from '../api/client'

/*
 * AuthProvider restores the session on start by exchanging the httpOnly refresh cookie
 * (POST /auth/refresh). Tests have no cookie or server, so this answers the auth calls
 * at the HTTP layer instead; everything above it (AuthProvider, interceptors) runs for real.
 */

let restoredUser = null

const reply = (config, status, data) => {
	const response = { data, status, statusText: String(status), headers: {}, config }
	if (status < 400) return response
	throw Object.assign(new Error(`Request failed with status code ${status}`), {
		isAxiosError: true,
		config,
		response,
	})
}

http.interceptors.request.use((config) => {
	if (config.url === '/auth/refresh') {
		config.adapter = async () =>
			restoredUser
				? reply(config, 200, { user: restoredUser, accessToken: 'token', expiresIn: 900 })
				: reply(config, 401, { message: 'Not signed in' })
	}
	if (config.url === '/auth/logout') config.adapter = async () => reply(config, 204, '')
	return config
})

/** The next <AuthProvider> mounts signed in as `user` (null: signed out). */
export const restoreSessionAs = (user) => {
	restoredUser = user
	if (user) localStorage.setItem('signedIn', 'true')
	else localStorage.removeItem('signedIn')
}
