import { PromoCode } from '../models/PromoCode.js'
import { badRequest, conflict } from '../utils/HttpError.js'
import { formatAmount } from './pricing.js'

const invalid = (message) => badRequest(message, [{ path: 'promoCode', message }])

/**
 * Finds a promo code that can be used for this subtotal right now.
 * @throws 400 with a `promoCode` field error explaining why it cannot be used
 */
export const findUsablePromo = async (code, subtotal, now = new Date()) => {
	const promo = await PromoCode.findOne({ code: code.trim().toUpperCase(), active: true }).lean()
	if (!promo) throw invalid('This promo code does not exist')
	if (promo.startsAt && promo.startsAt > now) throw invalid('This promo code is not active yet')
	if (promo.endsAt && promo.endsAt < now) throw invalid('This promo code has expired')
	if (promo.maxUses && promo.usedCount >= promo.maxUses) {
		throw invalid('This promo code has been used up')
	}
	if (subtotal < promo.minSubtotal) {
		throw invalid(`This promo code needs an order of at least ${formatAmount(promo.minSubtotal)}`)
	}
	return promo
}

/**
 * Counts one use of a promo code, only while uses are left (atomic, so the last use
 * cannot be taken twice). Call when an order is created.
 */
export const redeemPromo = async (promo) => {
	const result = await PromoCode.updateOne(
		{
			_id: promo._id,
			...(promo.maxUses && { usedCount: { $lt: promo.maxUses } }),
		},
		{ $inc: { usedCount: 1 } },
	)
	if (result.modifiedCount !== 1) throw conflict('This promo code has just been used up')
}

/** Gives a use back when an order with this code is cancelled. */
export const releasePromo = (code) =>
	PromoCode.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })
