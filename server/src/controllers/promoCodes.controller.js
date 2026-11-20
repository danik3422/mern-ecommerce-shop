import { PromoCode } from '../models/PromoCode.js'
import { notFound } from '../utils/HttpError.js'

/** null in a request clears an optional limit (dates, max uses) */
const toUpdate = (body) => {
	const $set = {}
	const $unset = {}
	for (const [key, value] of Object.entries(body)) {
		if (value === null) $unset[key] = ''
		else $set[key] = value
	}
	return { $set, ...(Object.keys($unset).length && { $unset }) }
}

export const listPromoCodes = async (_req, res) => {
	res.json(await PromoCode.find().sort({ createdAt: -1 }).lean())
}

export const createPromoCode = async (req, res) => {
	const body = Object.fromEntries(Object.entries(req.valid.body).filter(([, v]) => v !== null))
	res.status(201).json(await PromoCode.create(body))
}

export const updatePromoCode = async (req, res) => {
	const promo = await PromoCode.findByIdAndUpdate(req.valid.params.id, toUpdate(req.valid.body), {
		returnDocument: 'after',
		runValidators: true,
	})
	if (!promo) throw notFound('Promo code')
	res.json(promo)
}

export const deletePromoCode = async (req, res) => {
	const promo = await PromoCode.findByIdAndDelete(req.valid.params.id)
	if (!promo) throw notFound('Promo code')
	res.status(204).end()
}
