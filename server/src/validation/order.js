import { z } from 'zod'
import { ORDER_STATUSES } from '../models/Order.js'
import { lineItems } from './common.js'

const field = z.string().trim().min(1).max(200)

export const createOrderBody = z.strictObject({
	items: lineItems.min(1, 'Order must contain at least one item'),
	address: z.strictObject({
		fullName: field,
		street: field,
		city: field,
		postalCode: z.string().trim().min(2).max(20),
		country: field,
	}),
})

export const updateOrderStatusBody = z.strictObject({ status: z.enum(ORDER_STATUSES) })
