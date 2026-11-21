import {
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
		// a filtered view of Orders, never highlighted on its own
		plain: true,
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
