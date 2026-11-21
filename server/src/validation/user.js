import { z } from 'zod'
import { email, password, username } from './common.js'

export const updateMeBody = z
	.strictObject({
		username: username.optional(),
		email: email.optional(),
		newPassword: password.optional(),
		// required when changing email or password
		currentPassword: z.string().max(72).optional(),
	})
	.refine((body) => body.username || body.email || body.newPassword, 'Nothing to update')
	.refine((body) => !(body.email || body.newPassword) || body.currentPassword, {
		message: 'Current password is required to change email or password',
		path: ['currentPassword'],
	})

export const listUsersQuery = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
})
