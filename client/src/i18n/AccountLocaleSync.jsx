import { useEffect, useRef } from 'react'
import { updateProfile } from '../api/account'
import { useAuth } from '../auth/useAuth'
import { useI18n } from './useI18n'

/**
 * Keeps the signed-in customer's account language equal to the shop language, so emails
 * (sent by the server later, e.g. when an order ships) are in the language they use.
 * Runs after signing in and whenever the visitor switches the language. Renders nothing.
 */
const AccountLocaleSync = () => {
	const { user, updateUser } = useAuth()
	const { locale } = useI18n()
	// one request per user and language, also when it fails (it is retried after a reload)
	const sent = useRef(null)

	useEffect(() => {
		if (!user || user.locale === locale) return
		const key = `${user._id}:${locale}`
		if (sent.current === key) return
		sent.current = key
		updateProfile({ locale })
			.then((updated) => updateUser(updated))
			.catch(() => {})
	}, [user, locale, updateUser])

	return null
}

export default AccountLocaleSync
