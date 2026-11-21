import { AppState } from '../models/AppState.js'
import { resetDemoData } from '../seed/demo.js'

const CHECK_EVERY_MS = 60_000
const STATE_ID = 'demoReset'
const DAY_MS = 24 * 60 * 60 * 1000

/** "2026-11-21" and the hour (0–23) of `date` in `timeZone`. */
export const localDayAndHour = (date, timeZone) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			hourCycle: 'h23',
		})
			.formatToParts(date)
			.map(({ type, value }) => [type, value]),
	)
	return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

/**
 * The "reset night" a moment belongs to: the local day from the reset hour on, the previous
 * day before it. 02:00 and 03:00 on the 21st (reset hour 3) belong to the 20th and the 21st.
 */
export const resetNightOf = (date, { hour, timeZone }) => {
	const local = localDayAndHour(date, timeZone)
	return local.hour >= hour
		? local.day
		: localDayAndHour(new Date(date.getTime() - DAY_MS), timeZone).day
}

/**
 * Whether a reset is due: the last one happened before the most recent reset time.
 * Works for hosts that sleep: a server woken up at 10:00 still resets once that day.
 */
export const isResetDue = ({ now, lastResetAt, hour, timeZone }) =>
	!lastResetAt ||
	resetNightOf(new Date(lastResetAt), { hour, timeZone }) !== resetNightOf(now, { hour, timeZone })

/** Resets the demo data and remembers when, in the database (survives restarts). */
export const runDemoReset = async (reset = resetDemoData) => {
	const result = await reset()
	await AppState.updateOne(
		{ _id: STATE_ID },
		{ value: { lastResetAt: new Date(), ...result } },
		{ upsert: true },
	)
	return result
}

/**
 * Resets the demo shop every night at `hour` in `timeZone`: checked right away and then once
 * a minute, against the last reset time stored in the database.
 * @returns a function that stops the schedule
 */
export const scheduleDemoReset = ({ hour, timeZone, reset = resetDemoData, log = console }) => {
	let running = false

	const check = async () => {
		if (running) return
		running = true
		try {
			const state = await AppState.findById(STATE_ID).lean()
			if (
				!isResetDue({ now: new Date(), lastResetAt: state?.value?.lastResetAt, hour, timeZone })
			) {
				return
			}
			const result = await runDemoReset(reset)
			log.info?.(
				`Demo data reset: ${result.products} products, ${result.orders} orders, ` +
					`${result.removedAccounts} visitor accounts removed`,
			)
		} catch (error) {
			log.error?.('Demo data reset failed:', error)
		} finally {
			running = false
		}
	}

	check()
	const timer = setInterval(check, CHECK_EVERY_MS)
	timer.unref()
	return () => clearInterval(timer)
}
