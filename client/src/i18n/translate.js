/**
 * Message lookup for the i18n provider (pure functions, easy to test).
 *
 * Messages are nested objects: `t('cart.title')`. Placeholders look like `{name}`.
 * A message can have plural forms chosen with Intl.PluralRules by `count`:
 *   items: { one: '{count} item', other: '{count} items' }                 (English)
 *   items: { one: '{count} produkt', few: '{count} produkty', many: '{count} produktów' } (Polish)
 */

export const LOCALES = ['en', 'pl']
export const DEFAULT_LOCALE = 'en'

const lookup = (messages, key) =>
	key
		.split('.')
		.reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), messages)

const interpolate = (text, vars) =>
	text.replace(/\{(\w+)\}/g, (match, name) =>
		vars[name] === undefined ? match : String(vars[name]),
	)

const pluralRules = {}

const choosePlural = (forms, locale, count) => {
	pluralRules[locale] ??= new Intl.PluralRules(locale)
	return forms[pluralRules[locale].select(count)] ?? forms.other ?? Object.values(forms)[0]
}

/**
 * @param catalogs `{ en: messages, pl: messages }`
 * @returns `t(key, vars)` for the locale, falling back to English and finally to the key itself
 */
export const createTranslator =
	(catalogs, locale) =>
	(key, vars = {}) => {
		let message = lookup(catalogs[locale], key) ?? lookup(catalogs[DEFAULT_LOCALE], key)
		// `defaultValue` is for open-ended keys such as color names from the catalog
		if (message === undefined && 'defaultValue' in vars) return vars.defaultValue
		if (message === undefined) {
			if (import.meta.env.DEV) console.warn(`Missing translation: ${key}`)
			return key
		}
		if (typeof message === 'object') message = choosePlural(message, locale, vars.count ?? 0)
		return interpolate(message, vars)
	}

/** The visitor's choice, else the browser language when supported. */
export const detectLocale = (saved, browserLanguages = []) => {
	if (LOCALES.includes(saved)) return saved
	const match = browserLanguages
		.map((language) => language.slice(0, 2).toLowerCase())
		.find((language) => LOCALES.includes(language))
	return match ?? DEFAULT_LOCALE
}

/** BCP 47 tags used for number and date formatting. */
export const INTL_LOCALES = { en: 'en-GB', pl: 'pl-PL' }
