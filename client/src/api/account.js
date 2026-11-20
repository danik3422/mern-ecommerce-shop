import { http } from './client'

// Wishlist — product ids of the signed-in user
/** @returns {Promise<string[]>} product ids */
export const fetchWishlistIds = () => http.get('/account/wishlist/ids').then((r) => r.data)
/** @returns {Promise<object[]>} full products (public view) */
export const fetchWishlist = () => http.get('/account/wishlist').then((r) => r.data)
export const addToWishlist = (productId) =>
	http.put(`/account/wishlist/${productId}`).then((r) => r.data)
export const removeFromWishlist = (productId) =>
	http.delete(`/account/wishlist/${productId}`).then((r) => r.data)

// Address book
/** @returns {Promise<{ _id, fullName, street, city, postalCode, country, isDefault }[]>} */
export const fetchAddresses = () => http.get('/account/addresses').then((r) => r.data)
export const createAddress = (address) =>
	http.post('/account/addresses', address).then((r) => r.data)
export const updateAddress = (id, address) =>
	http.patch(`/account/addresses/${id}`, address).then((r) => r.data)
export const deleteAddress = (id) => http.delete(`/account/addresses/${id}`)

// Profile and orders (existing endpoints)
export const updateProfile = (changes) => http.patch('/users/me', changes).then((r) => r.data)
export const deleteAccount = () => http.delete('/users/me')
export const fetchMyOrders = () => http.get('/orders/mine').then((r) => r.data)

/**
 * Query keys. Data is per user, so hooks append the user id:
 * `[...accountKeys.addresses, userId]` — invalidating `accountKeys.addresses` still matches.
 */
export const accountKeys = {
	wishlistIds: ['account', 'wishlist', 'ids'],
	wishlist: ['account', 'wishlist'],
	addresses: ['account', 'addresses'],
	orders: ['account', 'orders'],
}
