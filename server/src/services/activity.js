import { ActivityLog } from '../models/ActivityLog.js'
import { User } from '../models/User.js'

/**
 * Route middleware that records a staff action once the request succeeded.
 * Only what `describe` returns is stored — never request bodies, so passwords stay out.
 *
 * @param action e.g. 'product.update'
 * @param describe `(req, body, locals) => ({ kind, id, label, details })` — `body` is the JSON
 *   response, `locals` is res.locals (e.g. the title of a deleted product)
 */
export const audit = (action, describe) => (req, res, next) => {
	let body
	const json = res.json.bind(res)
	res.json = (value) => {
		body = value
		return json(value)
	}
	res.on('finish', () => {
		if (res.statusCode >= 400 || !req.user) return
		const { details, ...target } = describe(req, body ?? {}, res.locals)
		recordActivity(req.user.id, action, target, details).catch((err) =>
			console.error(`Could not log "${action}":`, err),
		)
	})
	next()
}

export const recordActivity = async (actorId, action, target, details) => {
	const actor = await User.findById(actorId).select('username').lean()
	await ActivityLog.create({ actor: actorId, actorName: actor?.username, action, target, details })
}

/** Newest first: `{ items, page, pages, total }` */
export const listActivity = async ({ page, limit }) => {
	const [items, total] = await Promise.all([
		ActivityLog.find()
			.sort({ createdAt: -1, _id: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		ActivityLog.countDocuments(),
	])
	return { items, page, pages: Math.ceil(total / limit), total }
}
