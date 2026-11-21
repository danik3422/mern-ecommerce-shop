import { CURRENCY, SHOP_DEFAULTS } from '../src/config/shop.js'

export { roundMoney } from '../src/services/pricing.js'

/** Default shop settings — the settings every test starts with (the database is emptied). */
export const defaultSettings = () => ({ currency: CURRENCY, ...structuredClone(SHOP_DEFAULTS) })

/** Default list price of a delivery method, so tests do not hard-code the price list. */
export const price = (methodId) =>
	SHOP_DEFAULTS.shippingMethods.find((method) => method.id === methodId).price
