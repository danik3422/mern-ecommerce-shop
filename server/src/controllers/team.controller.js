import { listActivity } from '../services/activity.js'
import { PERMISSIONS, ROLE_PRESETS } from '../services/permissions.js'
import * as team from '../services/team.js'

/** GET /admin/team — staff accounts plus the permission list and presets for the form. */
export const listStaff = async (_req, res) => {
	res.json({ staff: await team.listStaff(), permissions: PERMISSIONS, presets: ROLE_PRESETS })
}

/** POST /admin/team — `{ username, email, password, permissions, isOwner }` */
export const createStaff = async (req, res) => {
	res.status(201).json(await team.createStaff(req.valid.body, req.user))
}

/** PATCH /admin/team/:id — `{ permissions?, isOwner?, blocked? }` */
export const updateStaff = async (req, res) => {
	res.json(await team.updateStaff(req.valid.params.id, req.valid.body, req.user))
}

/** POST /admin/team/:id/password — `{ password }`, a new temporary password */
export const resetPassword = async (req, res) => {
	res.json(await team.resetStaffPassword(req.valid.params.id, req.valid.body.password, req.user))
}

/** DELETE /admin/team/:id */
export const deleteStaff = async (req, res) => {
	const removed = await team.deleteStaff(req.valid.params.id, req.user)
	res.locals.label = removed.username
	res.status(204).end()
}

/** GET /admin/activity — owners only */
export const activity = async (req, res) => {
	res.json(await listActivity(req.valid.query))
}
