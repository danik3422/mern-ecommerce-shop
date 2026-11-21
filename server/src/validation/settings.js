import { z } from 'zod'
import { SHIPPING_METHOD_IDS } from '../config/shop.js'
import { roundMoney } from '../services/pricing.js'

const money = (max) =>
	z
		.number('Enter an amount')
		.nonnegative('Must be 0 or more')
		.max(max, `Must be at most ${max}`)
		.transform(roundMoney)

const wholeNumber = (min, max) =>
	z
		.int('Enter a whole number')
		.min(min, `Must be at least ${min}`)
		.max(max, `Must be at most ${max}`)

const label = z.string().trim().min(1, 'Enter a name').max(60, 'Use at most 60 characters')

const announcementText = z.string().trim().max(160, 'Use at most 160 characters').default('')

const shippingMethod = z
	.strictObject({
		id: z.enum(SHIPPING_METHOD_IDS),
		label: z.strictObject({ en: label, pl: label }),
		price: money(1000),
		freeShipping: z.boolean(),
		days: z.tuple([wholeNumber(0, 60), wholeNumber(0, 60)]),
		enabled: z.boolean(),
	})
	.refine((method) => method.days[0] <= method.days[1], {
		message: 'Must not be less than the minimum',
		path: ['days', 1],
	})

/**
 * PUT /admin/settings — the whole editable settings (the currency is fixed).
 * Delivery methods: each of the fixed ids exactly once, at least one enabled.
 */
export const updateSettingsBody = z.strictObject({
	shopName: z.string().trim().min(1, 'Enter the shop name').max(80, 'Use at most 80 characters'),
	contactEmail: z
		.string()
		.trim()
		.toLowerCase()
		.max(254, 'Use at most 254 characters')
		.refine((value) => value === '' || z.email().safeParse(value).success, 'Invalid email')
		.default(''),
	contactPhone: z
		.string()
		.trim()
		.max(30, 'Use at most 30 characters')
		.regex(/^[+\d\s()/-]*$/, 'Use digits, spaces and + ( ) - only')
		.default(''),
	announcement: z
		.strictObject({ en: announcementText, pl: announcementText })
		.default({ en: '', pl: '' }),
	// 0 or null: no free shipping
	freeShippingFrom: money(100_000)
		.nullable()
		.transform((value) => value || null),
	returnWindowDays: wholeNumber(1, 365),
	lowStockThreshold: wholeNumber(0, 1000),
	shippingMethods: z
		.array(shippingMethod)
		.length(SHIPPING_METHOD_IDS.length, 'Every delivery method must be listed')
		.refine(
			(methods) => SHIPPING_METHOD_IDS.every((id) => methods.some((method) => method.id === id)),
			'Every delivery method must be listed once',
		)
		.refine(
			(methods) => methods.some((method) => method.enabled),
			'Keep at least one delivery method enabled',
		),
})
