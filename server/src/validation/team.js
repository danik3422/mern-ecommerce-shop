import { z } from 'zod'
import { PERMISSION_NAMES } from '../services/permissions.js'
import { email, password, username } from './common.js'

const permissions = z
	.array(z.enum(PERMISSION_NAMES))
	.max(PERMISSION_NAMES.length)
	.transform((names) => [...new Set(names)])

export const createStaffBody = z.strictObject({
	username,
	email,
	// temporary: handed over to the new staff member, who changes it in their account
	password,
	permissions: permissions.default([]),
	isOwner: z.boolean().default(false),
})

export const updateStaffBody = z
	.strictObject({
		permissions: permissions.optional(),
		isOwner: z.boolean().optional(),
		// deactivated staff cannot sign in
		blocked: z.boolean().optional(),
	})
	.refine((body) => Object.values(body).some((value) => value !== undefined), 'Nothing to update')

export const resetPasswordBody = z.strictObject({ password })
