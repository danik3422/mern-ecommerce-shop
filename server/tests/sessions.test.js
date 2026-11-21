import { describe, expect, it, vi } from 'vitest'
import { Session } from '../src/models/Session.js'
import { User } from '../src/models/User.js'
import { ROTATION_GRACE_MS, maskIp } from '../src/services/sessions.js'
import { describeUserAgent } from '../src/services/userAgent.js'
import { DEFAULT_PASSWORD, ORIGIN, api, createUser, refreshCookieOf } from './helpers.js'

const CHROME_MAC =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const SAFARI_IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'

const refresh = (cookie) => {
	const req = api().post('/api/auth/refresh').set('Origin', ORIGIN)
	return cookie ? req.set('Cookie', cookie) : req
}
const logout = (cookie) =>
	api().post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', cookie)
const bearer = (body) => ({ Authorization: `Bearer ${body.accessToken}` })

/** Signs alice in on another "device"; returns `{ auth, cookie, body }`. */
const signIn = async (userAgent = CHROME_MAC) => {
	const res = await api()
		.post('/api/auth/login')
		.set('User-Agent', userAgent)
		.send({ login: 'alice', password: DEFAULT_PASSWORD })
		.expect(200)
	return { auth: bearer(res.body), cookie: refreshCookieOf(res), body: res.body }
}

describe('refresh cookie', () => {
	it('is httpOnly, SameSite=Lax and limited to /api/auth', async () => {
		const res = await api()
			.post('/api/auth/register')
			.send({ username: 'alice', email: 'alice@example.com', password: DEFAULT_PASSWORD })
			.expect(201)

		const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='))
		expect(cookie).toMatch(/HttpOnly/)
		expect(cookie).toMatch(/SameSite=Lax/)
		expect(cookie).toMatch(/Path=\/api\/auth/)
		expect(cookie).toMatch(/Max-Age=2592000/) // 30 days
		// Secure only in production (tests and local development run over http)
		expect(cookie).not.toMatch(/Secure/)
		// the refresh token never appears in the body, the access token does (short-lived)
		expect(JSON.stringify(res.body)).not.toContain(refreshCookieOf(res).split('=')[1])
		expect(res.body).toMatchObject({ accessToken: expect.any(String), expiresIn: 900 })
	})

	it('stores only a hash of the refresh token', async () => {
		const { cookie } = await createUser()
		const secret = cookie.split('=')[1].split('.')[1]
		const session = await Session.findOne().lean()
		expect(session.tokenHash).toMatch(/^[0-9a-f]{64}$/)
		expect(JSON.stringify(session)).not.toContain(secret)
	})
})

describe('POST /api/auth/refresh', () => {
	it('rotates the refresh token and returns a new access token and the user', async () => {
		const { cookie } = await createUser()
		const res = await refresh(cookie).expect(200)

		expect(res.body.user.username).toBe('alice')
		const rotated = refreshCookieOf(res)
		expect(rotated).toBeDefined()
		expect(rotated).not.toBe(cookie)
		await api().get('/api/users/me').set(bearer(res.body)).expect(200)
		// the new token keeps working, again and again
		await refresh(rotated).expect(200)
	})

	it('answers 401 without a cookie or with a malformed one', async () => {
		await refresh().expect(401)
		await refresh('refreshToken=garbage').expect(401)
		await refresh('refreshToken=0123456789abcdef01234567.secret').expect(401)
	})

	it('detects a reused refresh token and revokes the whole session', async () => {
		const { cookie: stolen } = await createUser()
		const rotated = refreshCookieOf(await refresh(stolen).expect(200))

		// after the grace period for parallel tabs, the old token means someone copied it
		vi.useFakeTimers({ now: Date.now() + ROTATION_GRACE_MS + 1000, toFake: ['Date'] })
		try {
			const res = await refresh(stolen).expect(401)
			expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/) // cookie cleared
			// the legitimate holder is signed out as well, so the thief's copy is worthless too
			await refresh(rotated).expect(401)
			expect(await Session.findOne().lean()).toMatchObject({ revokedReason: 'reuse' })
		} finally {
			vi.useRealTimers()
		}
	})

	it('lets two tabs refresh at the same moment without signing out', async () => {
		const { cookie } = await createUser()
		const [first, second] = await Promise.all([refresh(cookie), refresh(cookie)])

		expect([first.status, second.status]).toEqual([200, 200])
		// exactly one response carries the new cookie; the other keeps what the browser stores
		const newCookies = [first, second].map(refreshCookieOf).filter(Boolean)
		expect(newCookies).toHaveLength(1)
		await refresh(newCookies[0]).expect(200)
	})

	it('refuses blocked users and clears the cookie', async () => {
		const { user, cookie } = await createUser()
		await User.updateOne({ _id: user._id }, { blocked: true })
		const res = await refresh(cookie).expect(401)
		expect(res.body.message).toMatch(/blocked/i)
		expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/)
	})

	it('refuses an expired session', async () => {
		const { cookie } = await createUser()
		await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) })
		await refresh(cookie).expect(401)
	})
})

describe('CSRF protection', () => {
	it('rejects refresh and logout from a foreign or missing origin', async () => {
		const { cookie } = await createUser()
		const call = (path) => api().post(`/api/auth/${path}`).set('Cookie', cookie)

		await call('refresh').set('Origin', 'https://evil.example').expect(403)
		await call('logout').set('Origin', 'https://evil.example').expect(403)
		await call('refresh').set('Referer', 'https://evil.example/page').expect(403)
		// no Origin at all is not a browser on our page either
		await call('refresh').expect(403)
		// the shop itself (Origin, or Referer from older browsers) is fine
		await call('refresh').set('Referer', `${ORIGIN}/account`).expect(200)
	})

	it('rejects sign-in started by a foreign page (login CSRF)', async () => {
		await createUser()
		await api()
			.post('/api/auth/login')
			.set('Origin', 'https://evil.example')
			.send({ login: 'alice', password: DEFAULT_PASSWORD })
			.expect(403)
	})
})

describe('POST /api/auth/logout', () => {
	it('revokes the session at once: the access token stops working too', async () => {
		const { auth, cookie } = await createUser()
		const res = await logout(cookie).expect(204)
		expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;.*Expires=Thu, 01 Jan 1970/)

		await api().get('/api/users/me').set(auth).expect(401)
		await refresh(cookie).expect(401)
	})

	it('ends the session even when a refresh rotated the token a moment earlier', async () => {
		const { auth, cookie } = await createUser()
		await refresh(cookie).expect(200) // e.g. another tab, right before the sign-out
		await logout(cookie).expect(204)
		await api().get('/api/users/me').set(auth).expect(401)
		expect(await Session.countDocuments({ revokedAt: null })).toBe(0)
	})

	it('succeeds without a session', async () => {
		await logout('refreshToken=nothing').expect(204)
	})
})

describe('active sessions', () => {
	it('lists the devices with the current one first and a masked IP', async () => {
		await createUser()
		const phone = await signIn(SAFARI_IPHONE)
		const laptop = await signIn(CHROME_MAC)

		const { body } = await api().get('/api/auth/sessions').set(laptop.auth).expect(200)
		expect(body).toHaveLength(3) // registration, phone, laptop
		expect(body[0]).toMatchObject({ current: true, browser: 'Chrome', os: 'macOS', mobile: false })
		expect(body.find((s) => s.browser === 'Safari')).toMatchObject({
			os: 'iOS',
			mobile: true,
			current: false,
		})
		expect(body[0].ip).toBe('localhost') // loopback in tests; public IPs are masked
		expect(body[0]).not.toHaveProperty('tokenHash')
		await api().get('/api/auth/sessions').set(phone.auth).expect(200)
	})

	it('signs out one device, which gets 401 on its very next request', async () => {
		await createUser()
		const phone = await signIn(SAFARI_IPHONE)
		const laptop = await signIn(CHROME_MAC)
		const sessions = (await api().get('/api/auth/sessions').set(laptop.auth)).body
		const phoneSession = sessions.find((s) => s.browser === 'Safari')

		await api().get('/api/users/me').set(phone.auth).expect(200)
		await api().delete(`/api/auth/sessions/${phoneSession.id}`).set(laptop.auth).expect(204)
		// no waiting for the access token to expire
		await api().get('/api/users/me').set(phone.auth).expect(401)
		await refresh(phone.cookie).expect(401)
		await api().get('/api/users/me').set(laptop.auth).expect(200)
		// already gone
		await api().delete(`/api/auth/sessions/${phoneSession.id}`).set(laptop.auth).expect(404)
	})

	it('cannot sign out another user’s session', async () => {
		const alice = await createUser({ username: 'alice' })
		const bob = await createUser({ username: 'bob' })
		const [aliceSession] = (await api().get('/api/auth/sessions').set(alice.auth)).body

		await api().delete(`/api/auth/sessions/${aliceSession.id}`).set(bob.auth).expect(404)
		await api().get('/api/users/me').set(alice.auth).expect(200)
	})

	it('signs out all other devices', async () => {
		const registered = await createUser()
		const phone = await signIn(SAFARI_IPHONE)
		const laptop = await signIn(CHROME_MAC)

		const res = await api().post('/api/auth/sessions/revoke-others').set(laptop.auth).expect(200)
		expect(res.body).toEqual({ revoked: 2 })
		await api().get('/api/users/me').set(phone.auth).expect(401)
		await api().get('/api/users/me').set(registered.auth).expect(401)
		await api().get('/api/users/me').set(laptop.auth).expect(200)
		expect((await api().get('/api/auth/sessions').set(laptop.auth)).body).toHaveLength(1)
	})

	it('ends the previous session of the browser when signing in again', async () => {
		const { cookie } = await createUser()
		const res = await api()
			.post('/api/auth/login')
			.set('Cookie', cookie)
			.send({ login: 'alice', password: DEFAULT_PASSWORD })
			.expect(200)
		expect((await api().get('/api/auth/sessions').set(bearer(res.body))).body).toHaveLength(1)
	})
})

describe('revoking sessions on account changes', () => {
	it('a password change signs out every other device', async () => {
		const here = await createUser()
		const elsewhere = await signIn()

		await api()
			.patch('/api/users/me')
			.set(here.auth)
			.send({ newPassword: 'new-password-1', currentPassword: DEFAULT_PASSWORD })
			.expect(200)

		await api().get('/api/users/me').set(here.auth).expect(200)
		await api().get('/api/users/me').set(elsewhere.auth).expect(401)
		await refresh(elsewhere.cookie).expect(401)
	})

	it('changing only the username keeps the other devices signed in', async () => {
		const here = await createUser()
		const elsewhere = await signIn()
		await api().patch('/api/users/me').set(here.auth).send({ username: 'alice2' }).expect(200)
		await api().get('/api/users/me').set(elsewhere.auth).expect(200)
	})

	it('deleting the account ends all its sessions', async () => {
		const { auth, cookie } = await createUser()
		await api().delete('/api/users/me').set(auth).expect(204)
		await refresh(cookie).expect(401)
		expect(await Session.countDocuments({ revokedAt: null })).toBe(0)
	})

	it('blocking a customer and "sign out everywhere" in the admin panel end their sessions', async () => {
		const admin = await createUser({ username: 'boss', isAdmin: true })
		const alice = await createUser({ username: 'alice' })
		const second = await signIn()
		const customerUrl = `/api/admin/customers/${alice.user._id}`

		expect((await api().get(customerUrl).set(admin.auth)).body.activeSessions).toBe(2)
		const res = await api().post(`${customerUrl}/sessions/revoke`).set(admin.auth).expect(200)
		expect(res.body).toMatchObject({ revoked: 2 })
		await api().get('/api/users/me').set(alice.auth).expect(401)
		await api().get('/api/users/me').set(second.auth).expect(401)

		const third = await signIn()
		await api().patch(customerUrl).set(admin.auth).send({ blocked: true }).expect(200)
		await refresh(third.cookie).expect(401)
		expect((await api().get(customerUrl).set(admin.auth)).body.activeSessions).toBe(0)
	})

	it('needs the customers permission to sign a customer out', async () => {
		const clerk = await createUser({ username: 'clerk', permissions: ['orders'] })
		const alice = await createUser({ username: 'alice' })
		await api()
			.post(`/api/admin/customers/${alice.user._id}/sessions/revoke`)
			.set(clerk.auth)
			.expect(403)
	})

	it('deactivating, resetting the password of or removing staff ends their sessions', async () => {
		const owner = await createUser({ username: 'owner', isAdmin: true })
		const staffLogin = async () => {
			const res = await api()
				.post('/api/auth/login')
				.send({ login: 'ola', password: DEFAULT_PASSWORD })
				.expect(200)
			return { auth: bearer(res.body), cookie: refreshCookieOf(res) }
		}
		const { body: ola } = await api()
			.post('/api/admin/team')
			.set(owner.auth)
			.send({
				username: 'ola',
				email: 'ola@example.com',
				password: DEFAULT_PASSWORD,
				permissions: ['orders'],
			})
			.expect(201)
		const team = `/api/admin/team/${ola._id}`

		let session = await staffLogin()
		await api().patch(team).set(owner.auth).send({ blocked: true }).expect(200)
		await refresh(session.cookie).expect(401)
		await api().patch(team).set(owner.auth).send({ blocked: false }).expect(200)

		session = await staffLogin()
		await api()
			.post(`${team}/password`)
			.set(owner.auth)
			.send({ password: DEFAULT_PASSWORD })
			.expect(200)
		await api().get('/api/admin/orders').set(session.auth).expect(401)

		session = await staffLogin()
		await api().delete(team).set(owner.auth).expect(204)
		await refresh(session.cookie).expect(401)
	})
})

describe('helpers', () => {
	it('describes common browsers', () => {
		expect(describeUserAgent(CHROME_MAC)).toEqual({ browser: 'Chrome', os: 'macOS', mobile: false })
		expect(describeUserAgent(SAFARI_IPHONE)).toEqual({ browser: 'Safari', os: 'iOS', mobile: true })
		expect(
			describeUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
			),
		).toMatchObject({ browser: 'Edge', os: 'Windows' })
		expect(describeUserAgent('')).toEqual({ browser: null, os: null, mobile: false })
	})

	it('masks IP addresses', () => {
		expect(maskIp('83.24.120.7')).toBe('83.24.x.x')
		expect(maskIp('2a02:a31a:1:2::7')).toBe('2a02:a31a:…')
		expect(maskIp('::1')).toBe('localhost')
		expect(maskIp(undefined)).toBeNull()
	})
})
