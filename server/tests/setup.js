import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach, inject } from 'vitest'
import { clearShopSettingsCache } from '../src/services/shopSettings.js'

// must be set before src/config/env.js is imported by the test files
process.env.NODE_ENV = 'test'
process.env.MONGO_URL = inject('mongoUrl')
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters'
process.env.AUTH_RATE_LIMIT = '1000'

beforeAll(async () => {
	await mongoose.connect(process.env.MONGO_URL)
	// make sure unique indexes exist before tests rely on them
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
})

beforeEach(async () => {
	const collections = Object.values(mongoose.connection.collections)
	await Promise.all(collections.map((collection) => collection.deleteMany({})))
	// settings are cached in memory, so every test starts with the defaults again
	clearShopSettingsCache()
})

afterAll(() => mongoose.disconnect())
