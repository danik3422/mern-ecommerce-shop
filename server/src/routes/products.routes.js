import { Router } from 'express'
import * as products from '../controllers/products.controller.js'
import { requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import {
	createProductBody,
	facetsQuery,
	listProductsQuery,
	productRefParams,
	relatedQuery,
	updateProductBody,
} from '../validation/product.js'

export const productRoutes = Router()

// public — static paths first, so "facets" is never taken for a product slug
productRoutes.get('/', validate({ query: listProductsQuery }), products.listProducts)
productRoutes.get('/facets', validate({ query: facetsQuery }), products.productFacets)
productRoutes.get(
	'/:id/related',
	validate({ params: productRefParams, query: relatedQuery }),
	products.relatedProducts,
)
productRoutes.get('/:id', validate({ params: productRefParams }), products.getProduct)

// admin
productRoutes.post('/', requireAdmin, validate({ body: createProductBody }), products.createProduct)
productRoutes.patch(
	'/:id',
	requireAdmin,
	validate({ params: idParams, body: updateProductBody }),
	products.updateProduct,
)
productRoutes.delete('/:id', requireAdmin, validate({ params: idParams }), products.deleteProduct)
