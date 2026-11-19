import axios from 'axios'

// In development requests go through the Vite proxy (see vite.config.js).
export const http = axios.create({
	baseURL: import.meta.env.VITE_API_URL || '/api',
})

export const setAccessToken = (token) => {
	if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`
	else delete http.defaults.headers.common.Authorization
}

/** Calls `handler` when an authenticated request is rejected because the session is no longer valid. */
export const onSessionExpired = (handler) => {
	const id = http.interceptors.response.use(undefined, (error) => {
		const sentToken = Boolean(error.config?.headers?.Authorization)
		if (sentToken && error.response?.status === 401) handler()
		return Promise.reject(error)
	})
	return () => http.interceptors.response.eject(id)
}

/** A human-readable message for an API error, including field errors when present. */
export const getErrorMessage = (error) => {
	const data = error?.response?.data
	if (data?.details?.length) return data.details.map((d) => d.message).join('. ')
	return data?.message || error?.message || 'Something went wrong'
}
