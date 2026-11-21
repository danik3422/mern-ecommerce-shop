import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'
import { isResetDue, localDayAndHour } from '../src/services/demoReset.js'

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

	it('runs once per night, from the reset hour on', () => {
		const at = (iso, lastRunDay) =>
			isResetDue({ now: new Date(iso), lastRunDay, hour: 3, timeZone: WARSAW })
		expect(at('2026-11-21T01:59:00Z', null)).toBe(false) // 02:59 local
		expect(at('2026-11-21T02:00:00Z', null)).toBe(true) // 03:00 local
		expect(at('2026-11-21T02:01:00Z', '2026-11-21')).toBe(false) // already done today
		expect(at('2026-11-22T02:00:00Z', '2026-11-21')).toBe(true) // the next night
	})
})

describe('without demo mode', () => {
	it('has no demo sign-in and says so in the shop config', async () => {
		await api().post('/api/auth/demo').send({ account: 'customer' }).expect(404)
		const res = await api().get('/api/shop/config').expect(200)
		expect(res.body.demo).toEqual({ enabled: false })
	})
})
