import { http } from './client'

/**
 * @param params `{ category?, color?, size?, ids?, sort?, page?, limit? }`
 * @returns {Promise<{ items, page, pages, total }>}
 */
export const fetchProducts = (params, signal) =>
	http.get('/products', { params, signal }).then((r) => r.data)

export const fetchProduct = (id, signal) =>
	http.get(`/products/${id}`, { signal }).then((r) => r.data)

export const productKeys = {
	list: (params) => ['products', 'list', params],
	detail: (id) => ['products', 'detail', id],
}
