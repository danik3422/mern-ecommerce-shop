import {
	ChartNoAxesCombined,
	History,
	LayoutDashboard,
	MessageSquare,
	Package,
	RotateCcw,
	Settings,
	ShoppingCart,
	Tag,
	UserCog,
	Users,
} from 'lucide-react'
import { can } from './permissions'

/**
 * Sidebar sections with the permission each needs; `count` names a number from
 * GET /admin/counts shown as a badge. `owner` sections are for owners only.
 */
export const NAV = [
	{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard' },
	{
		to: '/admin/analytics',
		label: 'Analytics',
		icon: ChartNoAxesCombined,
		permission: 'analytics',
	},
	{ to: '/admin/products', label: 'Products', icon: Package, permission: 'products' },
	{
		to: '/admin/orders',
		label: 'Orders',
		icon: ShoppingCart,
		permission: 'orders',
		count: 'ordersToShip',
		countLabel: 'paid, waiting to be shipped',
	},
	{
		to: '/admin/orders?returnStatus=requested',
		label: 'Returns',
		icon: RotateCcw,
		permission: 'returns',
		count: 'openReturns',
		countLabel: 'open returns',
		// a filtered view of Orders: highlighted instead of Orders while the filter is on
	},
	{ to: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers' },
	{ to: '/admin/reviews', label: 'Reviews', icon: MessageSquare, permission: 'reviews' },
	{ to: '/admin/promo-codes', label: 'Promo codes', icon: Tag, permission: 'promoCodes' },
	{ to: '/admin/team', label: 'Team', icon: UserCog, permission: 'team' },
	{ to: '/admin/activity', label: 'Activity', icon: History, owner: true },
	{ to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings' },
]

/** The sections `user` may open, in sidebar order. */
export const allowedNav = (user) =>
	NAV.filter((item) => (item.owner ? user?.isAdmin && user.isOwner : can(user, item.permission)))

/** Whether `item` matches the current address: its path and, if it has one, its query. */
const matches = (item, { pathname, search }) => {
	const [path, query = ''] = item.to.split('?')
	const pathMatches = item.end
		? pathname === path
		: pathname === path || pathname.startsWith(`${path}/`)
	if (!pathMatches) return false
	const current = new URLSearchParams(search)
	return [...new URLSearchParams(query)].every(([key, value]) => current.get(key) === value)
}

/**
 * The one sidebar item to highlight: the most specific match, so the Returns view
 * (/admin/orders?returnStatus=requested) highlights Returns and not Orders as well.
 * @returns the item's `to`, or null
 */
export const activeNavTo = (items, location) => {
	const candidates = items.filter((item) => matches(item, location))
	// longer `to` = more specific (a query or a deeper path)
	candidates.sort((a, b) => b.to.length - a.to.length)
	return candidates[0]?.to ?? null
}
