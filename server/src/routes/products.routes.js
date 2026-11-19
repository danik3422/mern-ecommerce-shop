import { Router } from 'express'
import * as products from '../controllers/products.controller.js'
import { requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import { createProductBody, listProductsQuery, updateProductBody } from '../validation/product.js'

export const productRoutes = Router()

// public
productRoutes.get('/', validate({ query: listProductsQuery }), products.listProducts)
productRoutes.get('/:id', validate({ params: idParams }), products.getProduct)

// admin
productRoutes.post('/', requireAdmin, validate({ body: createProductBody }), products.createProduct)
productRoutes.patch(
	'/:id',
	requireAdmin,
	validate({ params: idParams, body: updateProductBody }),
	products.updateProduct,
)
productRoutes.delete('/:id', requireAdmin, validate({ params: idParams }), products.deleteProduct)
