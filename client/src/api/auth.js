import { http } from './client'

/** @returns {Promise<{ user, accessToken }>} */
export const login = (credentials) => http.post('/auth/login', credentials).then((r) => r.data)

/** @returns {Promise<{ user, accessToken }>} */
export const register = (payload) => http.post('/auth/register', payload).then((r) => r.data)

/**
 * Signs in to a shared demo account (only when the shop runs in demo mode).
 * @param account 'customer' | 'admin'
 * @returns {Promise<{ user, accessToken }>}
 */
export const loginAsDemo = (account) => http.post('/auth/demo', { account }).then((r) => r.data)
