import { z } from 'zod'
import { email, objectId } from './common.js'

export const stockAlertParams = z.object({ productId: objectId })

export const stockAlertBody = z.strictObject({
	// optional for products with a single color
	color: z.string().trim().toLowerCase().max(30).optional(),
	size: z.string().trim().min(1).max(20),
	// optional for signed-in customers: their account email is used
	email: email.optional(),
})
