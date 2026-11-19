import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api, setAuthToken } from '../api'
import { load, save } from '../utils/storage'

const AuthContext = createContext(null)

const initialUser = load('user', null)
setAuthToken(initialUser?.accessToken)

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(initialUser)

	const applyUser = useCallback((nextUser) => {
		setAuthToken(nextUser?.accessToken)
		save('user', nextUser)
		setUser(nextUser)
	}, [])

	const login = useCallback(
		async (username, password) => {
			const { data } = await api.post('/auth/login', { username, password })
			applyUser(data)
			return data
		},
		[applyUser]
	)

	const register = useCallback(
		async (payload) => {
			const { data } = await api.post('/auth/register', payload)
			applyUser(data)
			return data
		},
		[applyUser]
	)

	const logout = useCallback(() => applyUser(null), [applyUser])

	const value = useMemo(
		() => ({ user, login, register, logout }),
		[user, login, register, logout]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
