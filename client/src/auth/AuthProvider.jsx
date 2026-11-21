import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as authApi from '../api/auth'
import {
	isSessionEnded,
	refreshAccessToken,
	setAccessToken,
	setSessionHandlers,
} from '../api/client'
import { load, save } from '../utils/storage'
import { AuthContext } from './AuthContext'

/*
 * The session lives in two places, neither of them readable by an injected script:
 * - the short-lived access token: in memory (api/client.js), gone on reload;
 * - the refresh token: an httpOnly cookie, sent only to /api/auth.
 * On start the app exchanges the cookie for a new access token (POST /auth/refresh), refreshes
 * it shortly before it expires and once more after any 401 (single-flight, see api/client.js).
 */

/**
 * A non-secret hint that this browser may have a session cookie. Without it the app does not
 * call /auth/refresh on start, so anonymous visitors cost no extra request.
 */
const HINT_KEY = 'signedIn'
// before httpOnly cookies the whole session, token included, was kept here: remove it
const LEGACY_KEY = 'session'

/** Refresh this long before the access token expires. */
const REFRESH_EARLY_MS = 60_000
const RETRY_MS = 30_000
// the server always sends expiresIn; this only guards against a missing value
const DEFAULT_LIFETIME_MS = 15 * 60_000
const CHANNEL = 'auth'

save(LEGACY_KEY, null)

const hasHint = () => load(HINT_KEY, false) === true

/**
 * Tells the other tabs of this browser about sign-in and sign-out. One channel object per tab:
 * a channel does not receive its own messages, but would receive those of a second object.
 */
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)
const broadcast = (type) => channel?.postMessage({ type })

export const AuthProvider = ({ children }) => {
	// 'restoring' while the cookie is being exchanged on start — protected pages wait for it
	const [state, setState] = useState(() => ({
		status: hasHint() ? 'restoring' : 'ready',
		user: null,
	}))
	const refreshTimer = useRef(null)
	// bumped on every sign-out: a refresh that was already running must not sign back in
	const signOutCount = useRef(0)

	const clearSession = useCallback(() => {
		signOutCount.current += 1
		clearTimeout(refreshTimer.current)
		setAccessToken(null)
		save(HINT_KEY, null)
		setState({ status: 'ready', user: null })
	}, [])

	/** The server ended the session (revoked, expired, blocked): sign out in every tab. */
	const expire = useCallback(() => {
		clearSession()
		broadcast('logout')
	}, [clearSession])

	const scheduleRefresh = useCallback(
		(delayMs) => {
			const run = () =>
				refreshAccessToken().catch((error) => {
					// offline or a server hiccup: keep the session and try again a bit later
					if (isSessionEnded(error)) expire()
					else refreshTimer.current = setTimeout(run, RETRY_MS)
				})
			clearTimeout(refreshTimer.current)
			refreshTimer.current = setTimeout(run, delayMs)
		},
		[expire],
	)

	/** Applies `{ user, accessToken, expiresIn }` from sign-in or refresh. */
	const applySession = useCallback(
		({ user, accessToken, expiresIn }) => {
			setAccessToken(accessToken)
			save(HINT_KEY, true)
			setState({ status: 'ready', user })
			const lifetimeMs = Number.isFinite(expiresIn) ? expiresIn * 1000 : DEFAULT_LIFETIME_MS
			scheduleRefresh(Math.max(lifetimeMs - REFRESH_EARLY_MS, 5_000))
		},
		[scheduleRefresh],
	)

	// let the HTTP layer refresh the token and end the session
	useEffect(
		() =>
			setSessionHandlers({
				refresh: async () => {
					const signOutsBefore = signOutCount.current
					const session = await authApi.refreshSession()
					if (signOutCount.current !== signOutsBefore) throw new Error('Signed out meanwhile')
					applySession(session)
					return session.accessToken
				},
				onExpired: expire,
			}),
		[applySession, expire],
	)

	// on start: restore the session from the cookie
	useEffect(() => {
		if (!hasHint()) return
		refreshAccessToken().catch((error) => {
			if (isSessionEnded(error)) clearSession()
			// unreachable API: show the shop signed out, but try again on the next visit
			else setState({ status: 'ready', user: null })
		})
	}, [clearSession])

	// other tabs: follow their sign-in and sign-out
	useEffect(() => {
		if (!channel) return
		const handleMessage = ({ data }) => {
			if (data?.type === 'logout') clearSession()
			// the cookie is shared by all tabs: pick up the new session from it
			if (data?.type === 'login') refreshAccessToken().catch(() => clearSession())
		}
		channel.addEventListener('message', handleMessage)
		return () => channel.removeEventListener('message', handleMessage)
	}, [clearSession])

	useEffect(() => () => clearTimeout(refreshTimer.current), [])

	const signIn = useCallback(
		(session) => {
			applySession(session)
			broadcast('login')
			return session
		},
		[applySession],
	)

	const logout = useCallback(async () => {
		clearSession()
		broadcast('logout')
		try {
			await authApi.logout()
		} catch {
			// the local session is gone already; the server one expires on its own
		}
	}, [clearSession])

	const login = useCallback(
		async (credentials) => signIn(await authApi.login(credentials)),
		[signIn],
	)

	/** @param account 'customer' | 'admin' — shared demo accounts, see GET /shop/config `demo` */
	const loginAsDemo = useCallback(
		async (account) => signIn(await authApi.loginAsDemo(account)),
		[signIn],
	)

	const register = useCallback(async (payload) => signIn(await authApi.register(payload)), [signIn])

	/** Replaces the user after a profile change (the session stays the same). */
	const updateUser = useCallback((user) => setState((current) => ({ ...current, user })), [])

	const value = useMemo(
		() => ({
			user: state.user,
			isRestoring: state.status === 'restoring',
			login,
			loginAsDemo,
			register,
			logout,
			updateUser,
		}),
		[state, login, loginAsDemo, register, logout, updateUser],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
