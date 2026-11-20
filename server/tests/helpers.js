import request from 'supertest'
import { createApp } from '../src/app.js'
import { Product } from '../src/models/Product.js'
import { User } from '../src/models/User.js'

export const app = createApp()

export const api = () => request(app)

export const DEFAULT_PASSWORD = 'password123'

/** Registers a user through the API and returns its data with a ready auth header. */
export const createUser = async ({ username = 'alice', isAdmin = false } = {}) => {
	const res = await api()
		.post('/api/auth/register')
		.send({ username, email: `${username}@example.com`, password: DEFAULT_PASSWORD })
		.expect(201)

	if (isAdmin) await User.updateOne({ _id: res.body.user._id }, { isAdmin: true })

	return {
		user: res.body.user,
		token: res.body.accessToken,
		auth: { Authorization: `Bearer ${res.body.accessToken}` },
	}
}

let productCounter = 0

/** Creates an active product with sizes S and M (5 in stock each) and colors black/white. */
export const createProduct = (overrides = {}) => {
	const n = ++productCounter
	return Product.create({
		title: `Product ${n}`,
		slug: `product-${n}`,
		brand: 'Brand',
		description: 'A nice product',
		images: ['/images/products/product.jpg'],
		categories: ['women'],
		colors: ['black', 'white'],
		sizes: [
			{ label: 'S', stock: 5 },
			{ label: 'M', stock: 5 },
		],
		price: 10,
		...overrides,
	})
}

export const validAddress = {
	fullName: 'Alice Smith',
	street: 'Main st. 1',
	city: 'Warsaw',
	postalCode: '00-001',
	country: 'Poland',
}
