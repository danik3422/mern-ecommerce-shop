const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
})
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
})

/** Same order as ORDER_STATUSES in server/src/models/Order.js */
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '—')
export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : '—')

/** Short, readable order number: last 8 characters of the id. */
export const orderNumber = (id) => `#${id.slice(-8).toUpperCase()}`

export const totalStock = (product) => product.sizes.reduce((sum, size) => sum + size.stock, 0)

/** "Summer Linen Shirt!" → "summer-linen-shirt" */
export const slugify = (text) =>
	text
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
