import { formatMoney } from '../utils/money'

/**
 * An amount as the shop shows it, with plain spaces: Intl puts a non-breaking space
 * between the currency and the number, and Testing Library normalizes it to a space.
 */
export const money = (amount) => formatMoney(amount).replace(/\s/g, ' ')
