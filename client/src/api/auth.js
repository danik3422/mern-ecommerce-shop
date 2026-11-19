import { http } from './client'

/** @returns {Promise<{ user, accessToken }>} */
export const login = (credentials) => http.post('/auth/login', credentials).then((r) => r.data)

/** @returns {Promise<{ user, accessToken }>} */
export const register = (payload) => http.post('/auth/register', payload).then((r) => r.data)
