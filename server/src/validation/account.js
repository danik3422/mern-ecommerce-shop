import { z } from 'zod'
import { address, objectId } from './common.js'

export const MAX_ADDRESSES = 10

export const createAddressBody = address.extend({ isDefault: z.boolean().optional() })

export const updateAddressBody = address
	.extend({ isDefault: z.boolean() })
	.partial()
	.refine((body) => Object.keys(body).length > 0, 'Nothing to update')

export const addressParams = z.object({ id: objectId })

export const wishlistParams = z.object({ productId: objectId })
