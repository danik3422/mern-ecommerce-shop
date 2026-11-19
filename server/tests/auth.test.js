import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { DEFAULT_PASSWORD, api, createUser } from './helpers.js'

const register = (body) => api().post('/api/auth/register').send(body)
const login = (body) => api().post('/api/auth/login').send(body)

describe('POST /api/auth/register', () => {
	it('creates a user and returns a token without the password hash', async () => {
		const res = await register({
			username: 'bob',
			email: ' Bob@Example.com ',
			password: DEFAULT_PASSWORD,
		}).expect(201)

		expect(res.body.accessToken).toEqual(expect.any(String))
		expect(res.body.user).toMatchObject({
			username: 'bob',
			email: 'bob@example.com',
			isAdmin: false,
		})
		expect(res.body.user).not.toHaveProperty('passwordHash')
	})

	it.each([
		['invalid email', { username: 'bob', email: 'not-an-email', password: DEFAULT_PASSWORD }],
		['short password', { username: 'bob', email: 'bob@example.com', password: 'short' }],
		['short username', { username: 'b', email: 'bob@example.com', password: DEFAULT_PASSWORD }],
		['query operator', { username: 'bob', email: { $gt: '' }, password: DEFAULT_PASSWORD }],
		[
			'unknown field',
			{ username: 'bob', email: 'b@example.com', password: DEFAULT_PASSWORD, isAdmin: true },
		],
	])('rejects %s with 400', async (_case, body) => {
		const res = await register(body).expect(400)
		expect(res.body.details).toEqual(expect.any(Array))
	})

	it('returns 409 for a taken username or email', async () => {
		await createUser({ username: 'bob' })
		await register({
			username: 'bob',
			email: 'other@example.com',
			password: DEFAULT_PASSWORD,
		}).expect(409)
		await register({
			username: 'other',
			email: 'bob@example.com',
			password: DEFAULT_PASSWORD,
		}).expect(409)
	})

	it('returns 409, not 500, when the same user registers in parallel', async () => {
		const body = { username: 'race', email: 'race@example.com', password: DEFAULT_PASSWORD }
		const statuses = (await Promise.all([1, 2, 3].map(() => register(body)))).map((r) => r.status)
		expect(statuses.sort()).toEqual([201, 409, 409])
	})
})

describe('POST /api/auth/login', () => {
	it('logs in with username or email', async () => {
		await createUser({ username: 'bob' })
		await login({ login: 'bob', password: DEFAULT_PASSWORD }).expect(200)
		const res = await login({ login: 'BOB@example.com', password: DEFAULT_PASSWORD }).expect(200)
		expect(res.body.user.username).toBe('bob')
	})

	it('returns the same 401 for a wrong password and an unknown user', async () => {
		await createUser({ username: 'bob' })
		const wrongPassword = await login({ login: 'bob', password: 'wrong-password' }).expect(401)
		const unknownUser = await login({ login: 'nobody', password: 'wrong-password' }).expect(401)
		expect(wrongPassword.body).toEqual(unknownUser.body)
	})

	it('rejects query operators instead of passing them to MongoDB', async () => {
		await login({ login: { $ne: null }, password: 'x' }).expect(400)
	})

	it('blocks brute force after too many failed attempts', async () => {
		const limitedApp = createApp({ authRateLimit: 3 })
		const attempt = () =>
			request(limitedApp).post('/api/auth/login').send({ login: 'bob', password: 'wrong-password' })

		for (let i = 0; i < 3; i++) await attempt().expect(401)
		const res = await attempt().expect(429)
		expect(res.body.message).toMatch(/too many/i)
	})
})

describe('authentication', () => {
	it('rejects missing, malformed and invalid tokens with 401', async () => {
		await api().get('/api/users/me').expect(401)
		await api().get('/api/users/me').set('Authorization', 'Token abc').expect(401)
		await api().get('/api/users/me').set('Authorization', 'Bearer abc').expect(401)
	})

	it('rejects the token of a deleted user', async () => {
		const { auth } = await createUser()
		await api().delete('/api/users/me').set(auth).expect(204)
		await api().get('/api/users/me').set(auth).expect(401)
	})
})
