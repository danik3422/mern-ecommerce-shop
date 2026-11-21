import { Router } from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'
import { requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { updateSettingsBody } from '../validation/settings.js'

/** Mounted at /api/admin/settings — shop settings for admins (the public part is GET /shop/config). */
export const settingsRoutes = Router()

settingsRoutes.use(requirePermission('settings'))

settingsRoutes.get('/', getSettings)
settingsRoutes.put('/', validate({ body: updateSettingsBody }), updateSettings)
