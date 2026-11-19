import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('app', () => {
	it('reports health with database status', async () => {
		const res = await api().get('/api/health').expect(200)
		expect(res.body).toEqual({ status: 'ok', db: 'up' })
	})

	it('returns 404 JSON for unknown routes', async () => {
		const res = await api().get('/api/nope').expect(404)
		expect(res.body.message).toMatch(/not found/)
	})

	it('returns 400 for malformed JSON', async () => {
		await api()
			.post('/api/auth/login')
			.set('Content-Type', 'application/json')
			.send('{bad')
			.expect(400)
	})

	it('returns 413 for a too large body', async () => {
		await api()
			.post('/api/auth/login')
			.send({ login: 'a'.repeat(200_000), password: 'x' })
			.expect(413)
	})

	it('sets security headers and hides the framework', async () => {
		const res = await api().get('/api/health')
		expect(res.headers['x-powered-by']).toBeUndefined()
		expect(res.headers['x-content-type-options']).toBe('nosniff')
		expect(res.headers['content-security-policy']).toBeDefined()
	})
})
