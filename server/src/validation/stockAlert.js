import { z } from 'zod'
import { email, objectId } from './common.js'

export const stockAlertParams = z.object({ productId: objectId })

export const stockAlertBody = z.strictObject({
	size: z.string().trim().min(1).max(20),
	// optional for signed-in customers: their account email is used
	email: email.optional(),
})
