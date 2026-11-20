import { createContext } from 'react'

/** @type {React.Context<{ locale, setLocale, t, formatMoney, formatDate } | null>} */
export const I18nContext = createContext(null)
