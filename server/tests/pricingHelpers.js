import { findShippingMethod } from '../src/config/shop.js'

export { roundMoney } from '../src/services/pricing.js'

/** Current list price of a delivery method, so tests do not hard-code the price list. */
export const price = (methodId) => findShippingMethod(methodId).price
