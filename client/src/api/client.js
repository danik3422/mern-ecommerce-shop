import axios from 'axios'

// In development requests go through the Vite proxy (see vite.config.js).
export const http = axios.create({
	baseURL: import.meta.env.VITE_API_URL || '/api',
})

/*
 * Session handling (see auth/AuthProvider.jsx and the README "Security" section).
 *
 * The access token lives only in this module's memory — never in localStorage, where any
 * injected script could read it. It is short-lived; the long-lived refresh token is an
 * httpOnly cookie that JavaScript cannot touch at all and that only /api/auth endpoints get.
 */
let accessToken = null
let sessionHandlers = null
let refreshing = null

export const setAccessToken = (token) => {
	accessToken = token ?? null
}

/**
 * AuthProvider plugs in how to refresh the session and what to do when it is over.
 * @param handlers `{ refresh: () => Promise<string>, onExpired: () => void }`
 * @returns unregister function
 */
export const setSessionHandlers = (handlers) => {
	sessionHandlers = handlers
	return () => {
		if (sessionHandlers === handlers) sessionHandlers = null
	}
}

/**
 * Refreshes the access token — single-flight: however many requests fail with 401 at the same
 * time, only one POST /auth/refresh is sent and all of them wait for its result. (Rotation
 * would otherwise make parallel refreshes look like a stolen token to the server.)
 * @returns {Promise<string>} the new access token
 */
export const refreshAccessToken = () => {
	if (!sessionHandlers) return Promise.reject(new Error('No session'))
	refreshing ??= sessionHandlers.refresh().finally(() => {
		refreshing = null
	})
	return refreshing
}

/** True when the server said the session is over (not e.g. a network error). */
export const isSessionEnded = (error) => error?.response?.status === 401

// `skipAuth`: sign-in and refresh calls, which must not carry (or wait for) an access token
http.interceptors.request.use(async (config) => {
	if (config.skipAuth) return config
	// a refresh is running: wait for it, so the request does not go out with a stale token
	if (refreshing) await refreshing.catch(() => {})
	if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
	return config
})

// 401 on an authenticated request: the access token expired or the session was revoked.
// Refresh once and retry; if the refresh is refused too, the session is over.
http.interceptors.response.use(undefined, async (error) => {
	const { config, response } = error
	const sentToken = Boolean(config?.headers?.Authorization)
	if (response?.status !== 401 || !sentToken || config.retried || !sessionHandlers) throw error

	try {
		await refreshAccessToken()
	} catch (refreshError) {
		if (isSessionEnded(refreshError)) sessionHandlers?.onExpired()
		throw error
	}
	return http({ ...config, retried: true })
})

/** A human-readable message for an API error, including field errors when present. */
export const getErrorMessage = (error) => {
	const data = error?.response?.data
	if (data?.details?.length) return data.details.map((d) => d.message).join('. ')
	return data?.message || error?.message || 'Something went wrong'
}

/**
 * Field errors from a validation response, keyed by field path:
 * `{ email: 'Invalid email', 'address.city': '...' }`
 */
export const getFieldErrors = (error) =>
	Object.fromEntries(
		(error?.response?.data?.details ?? [])
			.filter((detail) => detail.path)
			.map((detail) => [detail.path, detail.message]),
	)
