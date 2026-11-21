import { z } from 'zod'
import { SHIPPING_METHOD_IDS } from '../config/shop.js'
import { roundMoney } from '../services/pricing.js'
import { isValidBankAccount, isValidNip, normalizeBankAccount, normalizeNip } from './taxIds.js'

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

const companyText = (max) => z.string().trim().max(max, `Use at most ${max} characters`).default('')

/** The seller on invoices. Every field may stay empty until the shop issues invoices. */
const company = z.strictObject({
	name: companyText(120),
	street: companyText(120),
	postalCode: companyText(10).refine(
		(value) => value === '' || /^\d{2}-\d{3}$/.test(value),
		'Use the format 00-000',
	),
	city: companyText(60),
	// stored as 10 digits
	nip: companyText(20)
		.refine((value) => value === '' || isValidNip(value), 'Enter a valid NIP (10 digits)')
		.transform((value) => value && normalizeNip(value)),
	// stored as 26 digits
	bankAccount: companyText(40)
		.refine(
			(value) => value === '' || isValidBankAccount(value),
			'Enter a valid Polish account number (26 digits)',
		)
		.transform((value) => value && normalizeBankAccount(value)),
})

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
	// optional, so older clients that do not send it keep the saved company data
	company: company.optional(),
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
