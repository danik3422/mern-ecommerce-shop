/** Formats amounts in the shop currency. */
export const createMoneyFormatter = (intlLocale, currency) => {
	const formatter = new Intl.NumberFormat(intlLocale, { style: 'currency', currency })
	return (value) => formatter.format(value)
}

/**
 * Default formatter for code outside the storefront (the admin panel is English-only).
 * Shop pages use `useI18n().formatMoney`, which follows the visitor's language.
 */
export const formatMoney = createMoneyFormatter('en-GB', 'PLN')
