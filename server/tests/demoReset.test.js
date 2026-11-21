import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'
import { AppState } from '../src/models/AppState.js'
import { isResetDue, localDayAndHour, runDemoReset } from '../src/services/demoReset.js'

const WARSAW = 'Europe/Warsaw'

describe('nightly demo reset schedule', () => {
	it('reads the day and hour in the shop time zone', () => {
		// 01:30 UTC in winter is 02:30 in Warsaw
		expect(localDayAndHour(new Date('2026-11-21T01:30:00Z'), WARSAW)).toEqual({
			day: '2026-11-21',
			hour: 2,
		})
		// 23:30 UTC is already the next day in Warsaw
		expect(localDayAndHour(new Date('2026-11-21T23:30:00Z'), WARSAW).day).toBe('2026-11-22')
	})

	it('runs once per night, also when the server was asleep at the reset hour', () => {
		const due = (now, lastResetAt) =>
			isResetDue({ now: new Date(now), lastResetAt, hour: 3, timeZone: WARSAW })
		// never reset yet
		expect(due('2026-11-21T10:00:00Z', null)).toBe(true)
		// reset at 03:00 local (02:00 UTC); later the same day nothing more happens
		expect(due('2026-11-21T20:00:00Z', '2026-11-21T02:00:00Z')).toBe(false)
		// 02:59 local the next night is still the same "reset night"
		expect(due('2026-11-22T01:59:00Z', '2026-11-21T02:00:00Z')).toBe(false)
		// from 03:00 local the next night it is due again
		expect(due('2026-11-22T02:00:00Z', '2026-11-21T02:00:00Z')).toBe(true)
		// asleep all night, woken up at noon: the missed reset happens now
		expect(due('2026-11-22T11:00:00Z', '2026-11-21T02:00:00Z')).toBe(true)
	})

	it('remembers the last reset in the database', async () => {
		let calls = 0
		const reset = async () => {
			calls++
			return { products: 1, orders: 0, removedAccounts: 0 }
		}
		await runDemoReset(reset)
		const state = await AppState.findById('demoReset').lean()
		expect(calls).toBe(1)
		expect(
			isResetDue({
				now: new Date(),
				lastResetAt: state.value.lastResetAt,
				hour: 3,
				timeZone: WARSAW,
			}),
		).toBe(false)
	})
})

describe('without demo mode', () => {
	it('has no demo sign-in and says so in the shop config', async () => {
		await api().post('/api/auth/demo').send({ account: 'customer' }).expect(404)
		const res = await api().get('/api/shop/config').expect(200)
		expect(res.body.demo).toEqual({ enabled: false })
	})
})
