import { z } from 'zod'

/** Longest period the analytics page can show (a leap year plus a day of slack). */
export const MAX_PERIOD_DAYS = 366

const day = z.iso.date('Use the YYYY-MM-DD format')

/**
 * GET /admin/analytics — `from` and `to` are calendar days in the shop time zone, both included.
 * Missing values are filled in by the service (default: the last 30 days up to today).
 */
export const analyticsQuery = z
	.object({
		from: day.optional(),
		to: day.optional(),
		// previous: compare with the period of the same length right before; none: skip it
		compare: z.enum(['previous', 'none']).default('previous'),
	})
	.refine(({ from, to }) => !from || !to || from <= to, {
		message: '"from" must not be after "to"',
		path: ['from'],
	})
