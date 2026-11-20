import { Router } from 'express'
import * as account from '../controllers/account.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
	addressParams,
	createAddressBody,
	updateAddressBody,
	wishlistParams,
} from '../validation/account.js'

/** Mounted at /api/account — wishlist and address book of the signed-in user. */
export const accountRoutes = Router()

accountRoutes.use(requireAuth)

accountRoutes.get('/wishlist', account.getWishlist)
accountRoutes.get('/wishlist/ids', account.getWishlistIds)
accountRoutes.put(
	'/wishlist/:productId',
	validate({ params: wishlistParams }),
	account.addToWishlist,
)
accountRoutes.delete(
	'/wishlist/:productId',
	validate({ params: wishlistParams }),
	account.removeFromWishlist,
)

accountRoutes.get('/addresses', account.listAddresses)
accountRoutes.post('/addresses', validate({ body: createAddressBody }), account.createAddress)
accountRoutes.patch(
	'/addresses/:id',
	validate({ params: addressParams, body: updateAddressBody }),
	account.updateAddress,
)
accountRoutes.delete('/addresses/:id', validate({ params: addressParams }), account.deleteAddress)
