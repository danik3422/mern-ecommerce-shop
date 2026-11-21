import { getAnalytics } from '../services/analytics.js'

/** GET /admin/analytics — sales report for a period (see services/analytics.js). */
export const analytics = async (req, res) => {
	res.json(await getAnalytics(req.valid.query))
}
