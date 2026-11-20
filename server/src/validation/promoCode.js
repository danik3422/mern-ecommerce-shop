import { z } from 'zod'
import { PROMO_TYPES } from '../models/PromoCode.js'

const fields = z.strictObject({
	code: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, digits, "-" or "_"'),
	description: z.string().trim().max(200).default(''),
	type: z.enum(PROMO_TYPES),
	value: z.number().nonnegative().default(0),
	minSubtotal: z.number().nonnegative().default(0),
	startsAt: z.coerce.date().nullable().optional(),
	endsAt: z.coerce.date().nullable().optional(),
	maxUses: z.int().min(1).nullable().optional(),
	active: z.boolean().default(true),
})

const rules = [
	{
		check: (p) => p.type !== 'percent' || (p.value > 0 && p.value <= 100),
		error: { message: 'A percentage must be between 1 and 100', path: ['value'] },
	},
	{
		check: (p) => p.type !== 'fixed' || p.value > 0,
		error: { message: 'Enter the amount taken off', path: ['value'] },
	},
	{
		check: (p) => !p.startsAt || !p.endsAt || p.endsAt > p.startsAt,
		error: { message: 'The end must be after the start', path: ['endsAt'] },
	},
]

const withRules = (schema) =>
	rules.reduce((current, rule) => current.refine(rule.check, rule.error), schema)

export const createPromoCodeBody = withRules(fields)

// type is required to check the value, so it is kept required on update
export const updatePromoCodeBody = withRules(
	fields
		.extend({
			description: fields.shape.description.removeDefault(),
			value: fields.shape.value.removeDefault(),
			minSubtotal: fields.shape.minSubtotal.removeDefault(),
			active: fields.shape.active.removeDefault(),
		})
		.partial()
		.required({ type: true }),
)
