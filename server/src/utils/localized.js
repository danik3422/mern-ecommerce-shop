/**
 * Languages of the shop content and emails. English is the default and the fallback:
 * every translated text has English, Polish is optional.
 */
export const LOCALES = ['en', 'pl']
export const DEFAULT_LOCALE = 'en'

/** A supported locale, else English (unknown values, old documents without one). */
export const toLocale = (value) => (LOCALES.includes(value) ? value : DEFAULT_LOCALE)

/**
 * `{ en, pl }` from a stored translated text. Products saved before descriptions were
 * translated keep a plain string, which is the English text.
 */
export const toLocalizedText = (value) =>
	typeof value === 'string' ? { en: value, pl: '' } : { en: value?.en ?? '', pl: value?.pl ?? '' }
