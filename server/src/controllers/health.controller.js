import { isDbConnected } from '../config/db.js'

export const health = (_req, res) => {
	const dbUp = isDbConnected()
	res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' })
}
