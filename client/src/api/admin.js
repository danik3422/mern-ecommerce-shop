import { http } from './client'

const data = (response) => response.data

// Dashboard
/** @returns {Promise<{ revenue, orders, ordersByStatus, customers, products, lowStock, revenuePerDay, topProducts, recentOrders }>} */
export const fetchAdminStats = () => http.get('/admin/stats').then(data)

// Products (list/detail include hidden products; writes use the product endpoints)
/** @param params `{ q?, status?: 'active'|'hidden', lowStock?: true, page?, limit? }` */
export const fetchAdminProducts = (params, signal) =>
	http.get('/admin/products', { params, signal }).then(data)
export const fetchAdminProduct = (id, signal) =>
	http.get(`/admin/products/${id}`, { signal }).then(data)
export const createProduct = (product) => http.post('/products', product).then(data)
export const updateProduct = (id, changes) => http.patch(`/products/${id}`, changes).then(data)
export const deleteProduct = (id) => http.delete(`/products/${id}`)

/** Uploads one image file. @returns {Promise<string>} its URL, e.g. /uploads/abc.jpg */
export const uploadImage = (file) => {
	const form = new FormData()
	form.append('image', file)
	return http.post('/admin/uploads', form).then((r) => r.data.url)
}

// Orders
/** @param params `{ status?, q?, page?, limit? }` */
export const fetchAdminOrders = (params, signal) =>
	http.get('/admin/orders', { params, signal }).then(data)
export const fetchAdminOrder = (id, signal) =>
	http.get(`/admin/orders/${id}`, { signal }).then(data)
export const updateOrderStatus = (id, status) =>
	http.patch(`/orders/${id}/status`, { status }).then(data)

// Customers
export const fetchUsers = (signal) =>
	http.get('/users', { params: { limit: 100 }, signal }).then(data)
export const setUserAdmin = (id, isAdmin) => http.patch(`/users/${id}`, { isAdmin }).then(data)
export const deleteUser = (id) => http.delete(`/users/${id}`)

// Reviews (deletion uses the public reviews endpoint, allowed for admins)
/** @param params `{ page?, limit? }` */
export const fetchAdminReviews = (params, signal) =>
	http.get('/admin/reviews', { params, signal }).then(data)
export const deleteReview = (productId, reviewId) =>
	http.delete(`/products/${productId}/reviews/${reviewId}`)

export const adminKeys = {
	all: ['admin'],
	stats: ['admin', 'stats'],
	products: (params) => ['admin', 'products', params],
	product: (id) => ['admin', 'product', id],
	orders: (params) => ['admin', 'orders', params],
	order: (id) => ['admin', 'order', id],
	users: ['admin', 'users'],
	reviews: (params) => ['admin', 'reviews', params],
}
