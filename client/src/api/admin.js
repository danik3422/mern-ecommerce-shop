import { http } from './client'

const data = (response) => response.data

// Dashboard
/** @returns {Promise<{ revenue, orders, ordersByStatus, customers, products, lowStock, revenuePerDay, topProducts, recentOrders }>} */
export const fetchAdminStats = () => http.get('/admin/stats').then(data)

/** The signed-in user with current role, owner flag and permissions. */
export const fetchMe = (signal) => http.get('/users/me', { signal }).then(data)

/** Numbers for the sidebar: `{ ordersToShip, ordersUnpaid, openReturns }` */
export const fetchAdminCounts = (signal) => http.get('/admin/counts', { signal }).then(data)

// Products (list/detail include hidden products; writes use the product endpoints)
/**
 * @param params `{ q?, status?: 'active'|'hidden', category?, brand?, onSale?: 'true'|'false',
 *   stock?: 'low'|'out', sort?, page?, limit? }`
 */
export const fetchAdminProducts = (params, signal) =>
	http.get('/admin/products', { params, signal }).then(data)
export const fetchAdminProduct = (id, signal) =>
	http.get(`/admin/products/${id}`, { signal }).then(data)
export const createProduct = (product) => http.post('/products', product).then(data)
export const updateProduct = (id, changes) => http.patch(`/products/${id}`, changes).then(data)
export const deleteProduct = (id) => http.delete(`/products/${id}`)
/** Brands and categories in use: `{ brands, categories }` */
export const fetchProductFilters = (signal) =>
	http.get('/admin/products/filters', { signal }).then(data)
/** A hidden copy titled "… (copy)". @returns the new product */
export const duplicateProduct = (id) => http.post(`/admin/products/${id}/duplicate`).then(data)
/**
 * One action for many products: `{ ids, action: 'show'|'hide'|'delete'|'discount', percent? }`
 * @returns `{ matched, modified }`
 */
export const bulkUpdateProducts = (body) => http.post('/admin/products/bulk', body).then(data)

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
/** Internal note, never shown to the customer; '' removes it. */
export const updateOrderNote = (id, adminNote) =>
	http.patch(`/admin/orders/${id}/note`, { adminNote }).then(data)

// Customers
export const fetchUsers = (signal) =>
	http.get('/users', { params: { limit: 100 }, signal }).then(data)
export const setUserAdmin = (id, isAdmin) => http.patch(`/users/${id}`, { isAdmin }).then(data)
export const deleteUser = (id) => http.delete(`/users/${id}`)
/** @param params `{ q?, status?: 'active'|'blocked', sort?: 'newest'|'oldest'|'spent', page?, limit? }` */
export const fetchCustomers = (params, signal) =>
	http.get('/admin/customers', { params, signal }).then(data)
/** Profile, addresses, orders, `stats: { orders, totalSpent, lastOrderAt }`, reviews count */
export const fetchCustomer = (id, signal) =>
	http.get(`/admin/customers/${id}`, { signal }).then(data)
/** `{ blocked }` — shoppers only; staff accounts are managed under Team */
export const updateCustomer = (id, changes) =>
	http.patch(`/admin/customers/${id}`, changes).then(data)

// Reviews (deletion uses the public reviews endpoint, allowed for admins)
/** @param params `{ page?, limit? }` */
export const fetchAdminReviews = (params, signal) =>
	http.get('/admin/reviews', { params, signal }).then(data)
export const deleteReview = (productId, reviewId) =>
	http.delete(`/products/${productId}/reviews/${reviewId}`)

export const fetchPromoCodes = (signal) => http.get('/admin/promo-codes', { signal }).then(data)
export const createPromoCode = (promo) => http.post('/admin/promo-codes', promo).then(data)
export const updatePromoCode = (id, changes) =>
	http.patch(`/admin/promo-codes/${id}`, changes).then(data)
export const deletePromoCode = (id) => http.delete(`/admin/promo-codes/${id}`)

export const adminKeys = {
	all: ['admin'],
	stats: ['admin', 'stats'],
	products: (params) => ['admin', 'products', params],
	product: (id) => ['admin', 'product', id],
	productFilters: ['admin', 'product-filters'],
	counts: ['admin', 'counts'],
	me: ['admin', 'me'],
	team: ['admin', 'team'],
	activity: (params) => ['admin', 'activity', params],
	orders: (params) => ['admin', 'orders', params],
	order: (id) => ['admin', 'order', id],
	users: ['admin', 'users'],
	customers: (params) => ['admin', 'customers', params],
	customer: (id) => ['admin', 'customer', id],
	reviews: (params) => ['admin', 'reviews', params],
	promoCodes: ['admin', 'promo-codes'],
}

/** Approve, reject or refund a return: `{ status, note? }` */
export const decideReturn = (orderId, decision) =>
	http.patch(`/admin/orders/${orderId}/return`, decision).then(data)

// Shop settings (the storefront reads the public part from GET /shop/config)
export const adminSettingsKey = ['admin', 'settings']
/**
 * @returns {Promise<{ currency, shopName, contactEmail, contactPhone, announcement: { en, pl },
 *   freeShippingFrom: number | null, returnWindowDays, lowStockThreshold,
 *   shippingMethods: [{ id, label: { en, pl }, price, freeShipping, days: [min, max], enabled }] }>}
 */
export const fetchShopSettings = (signal) => http.get('/admin/settings', { signal }).then(data)
/** Saves all editable settings (everything except `currency`); resolves with the saved settings. */
export const updateShopSettings = (settings) => http.put('/admin/settings', settings).then(data)

// Team (staff accounts) — needs the "team" permission
/** @returns `{ staff, permissions: { name: description }, presets }` */
export const fetchTeam = (signal) => http.get('/admin/team', { signal }).then(data)
/** `{ username, email, password, permissions, isOwner }` */
export const createStaff = (body) => http.post('/admin/team', body).then(data)
/** `{ permissions?, isOwner?, blocked? }` */
export const updateStaff = (id, changes) => http.patch(`/admin/team/${id}`, changes).then(data)
export const resetStaffPassword = (id, password) =>
	http.post(`/admin/team/${id}/password`, { password }).then(data)
export const deleteStaff = (id) => http.delete(`/admin/team/${id}`)

/** Owners only: `{ items: [{ actorName, action, target, details, createdAt }], page, pages, total }` */
export const fetchActivity = (params, signal) =>
	http.get('/admin/activity', { params, signal }).then(data)
