import { resetDemoData } from '../seed/demo.js'

const CHECK_EVERY_MS = 60_000

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
 * Whether the nightly reset is due: it is the reset hour (or later the same day, e.g. after
 * the server was asleep) and it has not run on this local day yet.
 */
export const isResetDue = ({ now, lastRunDay, hour, timeZone }) => {
	const local = localDayAndHour(now, timeZone)
	return local.hour >= hour && local.day !== lastRunDay
}

/**
 * Resets the demo shop every night at `hour` in `timeZone` (checked once a minute).
 * The first check marks today as done when the server starts after the reset hour,
 * so a restart during the day does not wipe what visitors are doing.
 * @returns a function that stops the schedule
 */
export const scheduleDemoReset = ({ hour, timeZone, reset = resetDemoData, log = console }) => {
	const startedAt = localDayAndHour(new Date(), timeZone)
	let lastRunDay = startedAt.hour >= hour ? startedAt.day : null
	let running = false

	const check = async () => {
		const now = new Date()
		if (running || !isResetDue({ now, lastRunDay, hour, timeZone })) return
		running = true
		lastRunDay = localDayAndHour(now, timeZone).day
		try {
			const result = await reset()
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

	const timer = setInterval(check, CHECK_EVERY_MS)
	timer.unref()
	return () => clearInterval(timer)
}
