import { describe, expect, it } from 'vitest'
import { NAV, activeNavTo } from './navigation'

const at = (path) => {
	const [pathname, search = ''] = path.split('?')
	return activeNavTo(NAV, { pathname, search: search && `?${search}` })
}

describe('admin sidebar highlight', () => {
	it('highlights Returns, not Orders, on the returns view', () => {
		expect(at('/admin/orders?returnStatus=requested')).toBe('/admin/orders?returnStatus=requested')
		expect(at('/admin/orders?returnStatus=requested&page=2')).toBe(
			'/admin/orders?returnStatus=requested',
		)
	})

	it('highlights Orders on the order list, other filters and order details', () => {
		expect(at('/admin/orders')).toBe('/admin/orders')
		expect(at('/admin/orders?status=paid')).toBe('/admin/orders')
		expect(at('/admin/orders?returnStatus=approved')).toBe('/admin/orders')
		expect(at('/admin/orders/abc123')).toBe('/admin/orders')
	})

	it('matches the dashboard only exactly and other sections by prefix', () => {
		expect(at('/admin')).toBe('/admin')
		expect(at('/admin/products/abc/edit')).toBe('/admin/products')
		expect(at('/admin/unknown')).toBeNull()
	})
})
