import { createMoneyFormatter } from '../utils/money'
import en from './messages/en'
import pl from './messages/pl'
import { createTranslator } from './translate'

export const CATALOGS = { en, pl }

/** Used outside <I18nProvider> (e.g. isolated component tests): English, PLN. */
export const DEFAULT_I18N = {
	locale: 'en',
	setLocale: () => {},
	t: createTranslator(CATALOGS, 'en'),
	formatMoney: createMoneyFormatter('en-GB', 'PLN'),
	formatDate: (value) =>
		new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)),
}
