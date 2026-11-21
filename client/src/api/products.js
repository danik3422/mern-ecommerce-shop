import { http } from './client'

/**
 * @param params `{ category?, q?, exact?, brand?, color?, size?, minPrice?, maxPrice?, onSale?,
 *   inStock?, ids?, sort?, page?, limit? }` — list filters are comma-separated strings;
 *   `q` is typo tolerant unless `exact` is 'true'
 * @returns {Promise<{ items, page, pages, total, search?: { query, correctedQuery } }>}
 *   `correctedQuery` is set when the results are for a corrected query ("jaket" → "jacket")
 */
export const fetchProducts = (params, signal) =>
	http.get('/products', { params, signal }).then((r) => r.data)

/**
 * Filter options for a category or a search.
 * @returns {Promise<{ brands, colors, sizes: { value, count }[], price: { min, max } }>}
 */
export const fetchFacets = (params, signal) =>
	http.get('/products/facets', { params, signal }).then((r) => r.data)

/**
 * Products, brands and categories for the search box (typo tolerant).
 * @returns {Promise<{ products, total, brands: { value, count }[], categories: string[],
 *   correctedQuery: string | null }>}
 */
export const fetchSearchSuggestions = (q, limit, signal) =>
	http.get('/products/suggestions', { params: { q, limit }, signal }).then((r) => r.data)

/**
 * @param id product id or slug
 * @returns product with `fit: { counts: { small, true, large }, total, verdict, share }` —
 *   what reviewers say about the fit; `verdict` ('small' | 'true' | 'large') or null
 */
export const fetchProduct = (id, signal) =>
	http.get(`/products/${id}`, { signal }).then((r) => r.data)

/** Products from the same categories. @returns {Promise<object[]>} */
export const fetchRelatedProducts = (id, limit, signal) =>
	http.get(`/products/${id}/related`, { params: { limit }, signal }).then((r) => r.data)

/**
 * Products often bought with this one, or similar products while orders are few.
 * @returns {Promise<{ source: 'orders' | 'related', items: object[] }>}
 */
export const fetchBoughtTogether = (id, signal) =>
	http.get(`/products/${id}/bought-together`, { signal }).then((r) => r.data)

export const productKeys = {
	list: (params) => ['products', 'list', params],
	facets: (params) => ['products', 'facets', params],
	detail: (id) => ['products', 'detail', id],
	related: (id, limit) => ['products', 'related', id, limit],
	boughtTogether: (id) => ['products', 'bought-together', id],
	suggestions: (q, limit) => ['products', 'suggestions', q, limit],
}

/**
 * Asks to be emailed when a sold-out size is back. `email` may be omitted when signed in;
 * `locale` is the language of the email.
 */
export const createStockAlert = (productId, { color, size, email, locale }) =>
	http
		.post(`/products/${productId}/stock-alerts`, { color, size, email, locale })
		.then((r) => r.data)
