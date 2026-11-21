import { z } from 'zod'
import { LOCALES } from '../utils/localized.js'

/** Language of the shop: 'en' | 'pl' (emails are sent in it). */
export const locale = z.enum(LOCALES)

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

export const idParams = z.object({ id: objectId })

export const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'))

// bcrypt ignores everything after 72 bytes
export const password = z.string().min(8, 'Password must be at least 8 characters').max(72)

export const username = z
	.string()
	.trim()
	.min(3, 'Username must be at least 3 characters')
	.max(30)
	.regex(/^[\w.-]+$/, 'Username may contain only letters, digits, "_", "." and "-"')

export const lineItem = z.strictObject({
	productId: objectId,
	quantity: z.int().min(1).max(99),
	size: z.string().trim().min(1).max(20),
	color: z.string().trim().max(30).optional(),
})

export const lineItems = z.array(lineItem).max(50)

export const address = z.strictObject({
	fullName: z.string().trim().min(1).max(200),
	street: z.string().trim().min(1).max(200),
	city: z.string().trim().min(1).max(200),
	postalCode: z.string().trim().min(2).max(20),
	country: z.string().trim().min(1).max(200),
})

// an absolute URL or a path served by this app, e.g. /images/products/tee.jpg or /uploads/abc.jpg
export const imagePath = z.union([z.url(), z.string().regex(/^\/[\w\-./]+$/, 'Invalid image path')])
