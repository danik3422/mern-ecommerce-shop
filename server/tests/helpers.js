import request from 'supertest'
import { createApp } from '../src/app.js'
import { Product } from '../src/models/Product.js'
import { User } from '../src/models/User.js'

export const app = createApp()

export const api = () => request(app)

export const DEFAULT_PASSWORD = 'password123'

/**
 * Registers a user through the API and returns its data with a ready auth header.
 * `isAdmin` makes it a staff owner (full access); `permissions` makes it staff with just those.
 */
export const createUser = async ({ username = 'alice', isAdmin = false, permissions } = {}) => {
	const res = await api()
		.post('/api/auth/register')
		.send({ username, email: `${username}@example.com`, password: DEFAULT_PASSWORD })
		.expect(201)

	if (isAdmin) {
		await User.updateOne({ _id: res.body.user._id }, { role: 'staff', isOwner: true })
	} else if (permissions) {
		await User.updateOne({ _id: res.body.user._id }, { role: 'staff', permissions })
	}

	return {
		user: res.body.user,
		token: res.body.accessToken,
		auth: { Authorization: `Bearer ${res.body.accessToken}` },
		cookie: refreshCookieOf(res),
	}
}

/** The shop's own origin (CLIENT_URL default): required by /auth/refresh and /auth/logout. */
export const ORIGIN = 'http://localhost:3000'

/** `refreshToken=…` from a response's Set-Cookie header, ready for a Cookie header. */
export const refreshCookieOf = (res) =>
	res.headers['set-cookie']?.find((c) => c.startsWith('refreshToken='))?.split(';')[0]

let productCounter = 0

/**
 * Creates an active product. By default it has the colors black and white,
 * each with sizes S and M (5 in stock). `colors`, `sizes` and `images` build identical
 * variants for every color; pass `variants` for full control.
 */
export const createProduct = ({
	colors = ['black', 'white'],
	sizes = [
		{ label: 'S', stock: 5 },
		{ label: 'M', stock: 5 },
	],
	images = ['/images/products/product.jpg'],
	variants,
	...overrides
} = {}) => {
	const n = ++productCounter
	return Product.create({
		title: `Product ${n}`,
		slug: `product-${n}`,
		brand: 'Brand',
		description: 'A nice product',
		categories: ['women'],
		variants: variants ?? colors.map((color) => ({ color, images, sizes })),
		price: 10,
		...overrides,
	})
}

/** Stock of a color and size as stored in the database. */
export const stockOf = async (productId, color, size) => {
	const product = await Product.findById(productId).lean()
	return product.variants.find((v) => v.color === color).sizes.find((s) => s.label === size).stock
}

export const validAddress = {
	fullName: 'Alice Smith',
	street: 'Main st. 1',
	city: 'Warsaw',
	postalCode: '00-001',
	country: 'Poland',
}
