import { CURRENCY } from '../../config/shop.js'
import { toLocale } from '../../utils/localized.js'

/**
 * Locale-aware formatting for emails. Amounts: "PLN 1,234.56" in English and
 * "1 234,56 zł" in Polish (Polish groups thousands from 1 000 on, like Polish shops do).
 * Dates in Polish time, where the shop is.
 */
const INTL = { en: 'en-GB', pl: 'pl-PL' }
const TIME_ZONE = 'Europe/Warsaw'

const moneyFormats = {
	en: new Intl.NumberFormat(INTL.en, {
		style: 'currency',
		currency: CURRENCY,
		currencyDisplay: 'code',
	}),
	pl: new Intl.NumberFormat(INTL.pl, {
		style: 'currency',
		currency: CURRENCY,
		useGrouping: 'always',
	}),
}

const dateFormats = Object.fromEntries(
	Object.entries(INTL).map(([locale, tag]) => [
		locale,
		new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeZone: TIME_ZONE }),
	]),
)

const pluralRules = Object.fromEntries(
	Object.entries(INTL).map(([locale, tag]) => [locale, new Intl.PluralRules(tag)]),
)

/**
 * Formatters for one language.
 * `plural(count, { one, few, many, other })` picks the form by the language's rules
 * and replaces `{count}`; missing forms fall back to `other`.
 */
export const formatters = (value) => {
	const locale = toLocale(value)
	return {
		locale,
		money: (amount) => moneyFormats[locale].format(amount),
		date: (date) => dateFormats[locale].format(new Date(date)),
		plural: (count, forms) =>
			(forms[pluralRules[locale].select(count)] ?? forms.other).replace('{count}', count),
	}
}
