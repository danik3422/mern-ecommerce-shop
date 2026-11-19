import { z } from 'zod'
import { email, password, username } from './common.js'

export const registerBody = z.strictObject({ username, email, password })

export const loginBody = z.strictObject({
	// username or email
	login: z.string().trim().min(1, 'Username or email is required').max(254),
	password: z.string().min(1, 'Password is required').max(72),
})
