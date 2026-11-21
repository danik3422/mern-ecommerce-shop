import { http } from './client'

/*
 * Calls that set, use or clear the httpOnly refresh cookie. `withCredentials` lets the browser
 * store and send that cookie when the API runs on another origin (VITE_API_URL); `skipAuth`
 * keeps the in-memory access token out of them (see api/client.js).
 */
const cookieRequest = { withCredentials: true, skipAuth: true }

/** @typedef {{ user: object, accessToken: string, expiresIn: number }} AuthSession */

/** @returns {Promise<AuthSession>} */
export const login = (credentials) =>
	http.post('/auth/login', credentials, cookieRequest).then((r) => r.data)

/** @returns {Promise<AuthSession>} */
export const register = (payload) =>
	http.post('/auth/register', payload, cookieRequest).then((r) => r.data)

/**
 * Signs in to a shared demo account (only when the shop runs in demo mode).
 * @param account 'customer' | 'admin'
 * @returns {Promise<AuthSession>}
 */
export const loginAsDemo = (account) =>
	http.post('/auth/demo', { account }, cookieRequest).then((r) => r.data)

/** Exchanges the refresh cookie for a new access token (and a rotated cookie). @returns {Promise<AuthSession>} */
export const refreshSession = () =>
	http.post('/auth/refresh', null, cookieRequest).then((r) => r.data)

/** Ends this browser's session on the server and clears the cookie. */
export const logout = () => http.post('/auth/logout', null, cookieRequest)

/**
 * Active sessions of the signed-in user, the current one first.
 * @returns {Promise<{ id, browser, os, mobile, ip, createdAt, lastUsedAt, current }[]>}
 */
export const fetchSessions = () => http.get('/auth/sessions').then((r) => r.data)

/** Signs out one device. */
export const revokeSession = (id) => http.delete(`/auth/sessions/${id}`)

/** Signs out every device except this one. @returns {Promise<{ revoked: number }>} */
export const revokeOtherSessions = () =>
	http.post('/auth/sessions/revoke-others').then((r) => r.data)

export const sessionKeys = { all: ['auth', 'sessions'] }
