import { z } from 'zod'
import { ORDER_STATUSES } from '../models/Order.js'
import { address, lineItems } from './common.js'

export const createOrderBody = z.strictObject({
	items: lineItems.min(1, 'Order must contain at least one item'),
	address,
})

export const updateOrderStatusBody = z.strictObject({ status: z.enum(ORDER_STATUSES) })
