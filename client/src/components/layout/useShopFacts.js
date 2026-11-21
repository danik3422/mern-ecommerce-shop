import { useShopConfig } from '../../hooks/useShopConfig'
import { deliveryName } from '../../i18n/catalogText'
import { useI18n } from '../../i18n/useI18n'

/** "200,00 zł" → "200 zł": whole amounts read better in short notes. */
const stripZeroCents = (text) => text.replace(/[.,]00(?!\d)/, '')

/**
 * Translated one-line facts about delivery and returns from the shop config,
 * shared by the announcement bar, the mobile menu and the footer.
 * @returns `null` until the config is loaded
 */
export const useShopFacts = () => {
	const config = useShopConfig()
	const { t, locale, formatMoney } = useI18n()
	if (!config) return null

	const methods = config.shippingMethods ?? []
	const fastest = Math.min(...methods.map((method) => method.days[0]))
	const slowest = Math.max(...methods.map((method) => method.days[1]))
	// null when the shop has no free delivery threshold
	const freeFrom = config.freeShippingFrom
		? stripZeroCents(formatMoney(config.freeShippingFrom))
		: null

	return {
		freeFrom,
		freeDelivery: freeFrom && t('layout.freeDelivery', { amount: freeFrom }),
		// optional text set in the admin settings, in the current language
		announcement: config.announcement?.[locale] || null,
		shopName: config.shopName || 'Clothe Shop',
		contact: config.contact ?? {},
		freeReturns: t('layout.freeReturns', { days: config.returnWindowDays ?? 30 }),
		deliveryTime: methods.length ? t('layout.deliveryTime', { from: fastest, to: slowest }) : null,
		returnWindowDays: config.returnWindowDays ?? 30,
		currency: config.currency,
		methods: methods.map((method) => ({
			id: method.id,
			name: deliveryName(t, locale, method),
			days: t('delivery.days', { from: method.days[0], to: method.days[1] }),
			price: formatMoney(method.price),
			freeShipping: method.freeShipping,
		})),
	}
}
