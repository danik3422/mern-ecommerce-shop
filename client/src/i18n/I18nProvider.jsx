import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShopConfig } from '../hooks/useShopConfig'
import { createMoneyFormatter } from '../utils/money'
import { load, save } from '../utils/storage'
import { I18nContext } from './I18nContext'
import { CATALOGS } from './defaults'
import { INTL_LOCALES, createTranslator, detectLocale } from './translate'

const STORAGE_KEY = 'locale'

const initialLocale = () =>
	detectLocale(load(STORAGE_KEY, null), typeof navigator === 'undefined' ? [] : navigator.languages)

/**
 * Language of the shop (English or Polish) and locale-aware formatting.
 * The choice is remembered in the browser; the first visit follows the browser language.
 */
export const I18nProvider = ({ children }) => {
	const [locale, setLocaleState] = useState(initialLocale)
	// PLN until the shop config is loaded
	const currency = useShopConfig()?.currency ?? 'PLN'
	const intlLocale = INTL_LOCALES[locale]

	useEffect(() => {
		document.documentElement.lang = locale
	}, [locale])

	const setLocale = useCallback((next) => {
		save(STORAGE_KEY, next)
		setLocaleState(next)
	}, [])

	const value = useMemo(() => {
		const dateFormatter = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' })
		return {
			locale,
			setLocale,
			t: createTranslator(CATALOGS, locale),
			formatMoney: createMoneyFormatter(intlLocale, currency),
			formatDate: (value) => dateFormatter.format(new Date(value)),
		}
	}, [locale, setLocale, intlLocale, currency])

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
