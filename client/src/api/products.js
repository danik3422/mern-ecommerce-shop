import { http } from './client'

/**
 * @param params `{ category?, q?, brand?, color?, size?, minPrice?, maxPrice?, onSale?, inStock?,
 *   ids?, sort?, page?, limit? }` — list filters are comma-separated strings
 * @returns {Promise<{ items, page, pages, total }>}
 */
export const fetchProducts = (params, signal) =>
	http.get('/products', { params, signal }).then((r) => r.data)

/**
 * Filter options for a category or a search.
 * @returns {Promise<{ brands, colors, sizes: { value, count }[], price: { min, max } }>}
 */
export const fetchFacets = (params, signal) =>
	http.get('/products/facets', { params, signal }).then((r) => r.data)

/** @param id product id or slug */
export const fetchProduct = (id, signal) =>
	http.get(`/products/${id}`, { signal }).then((r) => r.data)

/** Products from the same categories. @returns {Promise<object[]>} */
export const fetchRelatedProducts = (id, limit, signal) =>
	http.get(`/products/${id}/related`, { params: { limit }, signal }).then((r) => r.data)

export const productKeys = {
	list: (params) => ['products', 'list', params],
	facets: (params) => ['products', 'facets', params],
	detail: (id) => ['products', 'detail', id],
	related: (id, limit) => ['products', 'related', id, limit],
}
