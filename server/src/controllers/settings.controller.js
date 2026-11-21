import { getShopSettings, updateShopSettings } from '../services/shopSettings.js'

/** GET /admin/settings — all shop settings, including disabled delivery methods */
export const getSettings = async (_req, res) => {
	res.json(await getShopSettings())
}

/** PUT /admin/settings — replaces the editable settings; responds with the saved settings */
export const updateSettings = async (req, res) => {
	res.json(await updateShopSettings(req.valid.body))
}
