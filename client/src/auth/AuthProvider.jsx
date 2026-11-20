import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { onSessionExpired, setAccessToken } from '../api/client'
import { load, save } from '../utils/storage'
import { AuthContext } from './AuthContext'

const STORAGE_KEY = 'session'

const readSession = () => {
	const session = load(STORAGE_KEY, null)
	return session?.user && session?.accessToken ? session : null
}

// Restore the session before the first request is sent
const initialSession = readSession()
setAccessToken(initialSession?.accessToken)

export const AuthProvider = ({ children }) => {
	const [session, setSession] = useState(initialSession)

	const applySession = useCallback((nextSession) => {
		setAccessToken(nextSession?.accessToken)
		save(STORAGE_KEY, nextSession)
		setSession(nextSession)
	}, [])

	const logout = useCallback(() => applySession(null), [applySession])

	// an expired token or a deleted account signs the user out
	useEffect(() => onSessionExpired(logout), [logout])

	const login = useCallback(
		async (credentials) => applySession(await authApi.login(credentials)),
		[applySession],
	)

	const register = useCallback(
		async (payload) => applySession(await authApi.register(payload)),
		[applySession],
	)

	/** Replaces the stored user after a profile change (the token stays the same). */
	const updateUser = useCallback(
		(user) =>
			setSession((current) => {
				const next = current && { ...current, user }
				save(STORAGE_KEY, next)
				return next
			}),
		[],
	)

	const value = useMemo(
		() => ({ user: session?.user ?? null, login, register, logout, updateUser }),
		[session, login, register, logout, updateUser],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
