import { Router } from 'express'
import * as products from '../controllers/products.controller.js'
import { requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { audit } from '../services/activity.js'
import { idParams } from '../validation/common.js'
import {
	boughtTogetherQuery,
	createProductBody,
	facetsQuery,
	listProductsQuery,
	productRefParams,
	relatedQuery,
	suggestionsQuery,
	updateProductBody,
} from '../validation/product.js'

export const productRoutes = Router()

// public — static paths first, so "facets" is never taken for a product slug
productRoutes.get('/', validate({ query: listProductsQuery }), products.listProducts)
productRoutes.get('/facets', validate({ query: facetsQuery }), products.productFacets)
productRoutes.get('/suggestions', validate({ query: suggestionsQuery }), products.searchSuggestions)
productRoutes.get(
	'/:id/bought-together',
	validate({ params: productRefParams, query: boughtTogetherQuery }),
	products.boughtTogetherProducts,
)
productRoutes.get(
	'/:id/related',
	validate({ params: productRefParams, query: relatedQuery }),
	products.relatedProducts,
)
productRoutes.get('/:id', validate({ params: productRefParams }), products.getProduct)

// staff with the "products" permission
const canEdit = requirePermission('products')
const productTarget = (req, body, locals) => ({
	kind: 'product',
	id: body._id ?? req.valid.params?.id,
	label: body.title ?? locals.label,
})

productRoutes.post(
	'/',
	canEdit,
	validate({ body: createProductBody }),
	audit('product.create', productTarget),
	products.createProduct,
)
productRoutes.patch(
	'/:id',
	canEdit,
	validate({ params: idParams, body: updateProductBody }),
	audit('product.update', (req, body, locals) => ({
		...productTarget(req, body, locals),
		// a save in the full editor sends every field
		details:
			Object.keys(req.valid.body).length > 4
				? 'saved in the editor'
				: Object.keys(req.valid.body).join(', '),
	})),
	products.updateProduct,
)
productRoutes.delete(
	'/:id',
	canEdit,
	validate({ params: idParams }),
	audit('product.delete', productTarget),
	products.deleteProduct,
)
