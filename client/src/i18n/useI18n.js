import { useContext } from 'react'
import { DEFAULT_I18N } from './defaults'
import { I18nContext } from './I18nContext'

/**
 * `const { t, locale, setLocale, formatMoney, formatDate } = useI18n()`
 * Outside <I18nProvider> (isolated component tests) it falls back to English.
 */
export const useI18n = () => useContext(I18nContext) ?? DEFAULT_I18N
