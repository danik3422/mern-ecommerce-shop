/**
 * Staff permissions — the single list the server checks (mirrored in client/src/admin/permissions.js).
 *
 * Accounts have a role: 'customer' (shoppers who signed up) or 'staff' (created in the admin
 * panel under Team). Staff can use the areas listed in their `permissions`; owners (`isOwner`)
 * can use everything, including Team. Role presets in the admin UI only fill the checkboxes:
 * the stored data is always the permission list.
 */
export const PERMISSIONS = {
	dashboard: 'Dashboard: sales, stock and best sellers',
	analytics: 'Analytics: sales reports, funnel, top products and returns',
	products: 'Products: create, edit, hide, delete, prices and stock, image uploads',
	orders: 'Orders: view, change status, internal notes',
	returns: 'Returns: approve, reject and refund',
	customers: 'Customers: view accounts and orders, block, delete',
	reviews: 'Reviews: read and delete',
	promoCodes: 'Promo codes: create, edit, delete',
	settings: 'Shop settings',
	team: 'Team: staff accounts and permissions',
}

export const PERMISSION_NAMES = Object.keys(PERMISSIONS)

/** Shortcuts for the Team form. */
export const ROLE_PRESETS = {
	owner: PERMISSION_NAMES,
	manager: PERMISSION_NAMES.filter((name) => name !== 'team' && name !== 'settings'),
	support: ['orders', 'returns', 'customers', 'reviews'],
	warehouse: ['dashboard', 'products'],
}

export const isStaff = (user) => user?.role === 'staff'

/** True when `user` (a User document or req.user) may use the area `permission`. */
export const hasPermission = (user, permission) =>
	isStaff(user) && Boolean(user.isOwner || user.permissions?.includes(permission))
