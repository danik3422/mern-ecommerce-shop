/**
 * Staff permissions — mirrors server/src/services/permissions.js.
 * Owners can do everything; other staff only what their `permissions` list.
 */
export const PERMISSIONS = [
	{ name: 'dashboard', label: 'Dashboard', hint: 'Sales, stock and best sellers' },
	{ name: 'analytics', label: 'Analytics', hint: 'Sales reports, funnel, returns' },
	{ name: 'products', label: 'Products', hint: 'Create, edit, prices, stock, photos' },
	{ name: 'orders', label: 'Orders', hint: 'View, change status, internal notes' },
	{ name: 'returns', label: 'Returns', hint: 'Approve, reject and refund' },
	{ name: 'customers', label: 'Customers', hint: 'Accounts, orders, block' },
	{ name: 'reviews', label: 'Reviews', hint: 'Read and delete' },
	{ name: 'promoCodes', label: 'Promo codes', hint: 'Create, edit, delete' },
	{ name: 'settings', label: 'Settings', hint: 'Shop settings' },
	{ name: 'team', label: 'Team', hint: 'Staff accounts and permissions' },
]

const ALL = PERMISSIONS.map((permission) => permission.name)

/** Shortcuts that fill the checkboxes; what is stored is the permission list. */
export const ROLE_PRESETS = [
	{ id: 'owner', label: 'Owner', permissions: ALL, isOwner: true },
	{
		id: 'manager',
		label: 'Manager',
		permissions: ALL.filter((name) => name !== 'team' && name !== 'settings'),
	},
	{ id: 'support', label: 'Support', permissions: ['orders', 'returns', 'customers', 'reviews'] },
	{ id: 'warehouse', label: 'Content / Warehouse', permissions: ['dashboard', 'products'] },
]

export const isStaff = (user) => Boolean(user?.isAdmin)

/** True when the signed-in `user` may use the admin area `permission`. */
export const can = (user, permission) =>
	isStaff(user) && Boolean(user.isOwner || user.permissions?.includes(permission))

/** The preset whose permissions match exactly, e.g. to label a staff member. */
export const matchingPreset = ({ isOwner, permissions }) =>
	isOwner
		? ROLE_PRESETS[0]
		: ROLE_PRESETS.slice(1).find(
				(preset) =>
					preset.permissions.length === permissions.length &&
					preset.permissions.every((name) => permissions.includes(name)),
			)
