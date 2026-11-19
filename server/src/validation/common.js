import { z } from 'zod'

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
	color: z.string().trim().max(30).optional(),
	size: z.string().trim().max(10).optional(),
})

export const lineItems = z.array(lineItem).max(50)
