import axios from 'axios'

// In development requests go through the CRA proxy (see "proxy" in package.json).
// In production set REACT_APP_API_URL to the backend URL, e.g. https://api.example.com/api
export const api = axios.create({
	baseURL: process.env.REACT_APP_API_URL || '/api',
})

export const setAuthToken = (token) => {
	if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
	else delete api.defaults.headers.common.Authorization
}

export const getErrorMessage = (err) =>
	err?.response?.data?.message || err?.message || 'Something went wrong'
