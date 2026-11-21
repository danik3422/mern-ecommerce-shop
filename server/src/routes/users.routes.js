import { Router } from 'express'
import * as users from '../controllers/users.controller.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import { listUsersQuery, updateMeBody } from '../validation/user.js'

export const userRoutes = Router()

// signed-in user: own account
userRoutes.get('/me', requireAuth, users.getMe)
userRoutes.patch('/me', requireAuth, validate({ body: updateMeBody }), users.updateMe)
userRoutes.delete('/me', requireAuth, users.deleteMe)

// staff with the "customers" permission; staff accounts are managed under /admin/team
const canManage = requirePermission('customers')
userRoutes.get('/', canManage, validate({ query: listUsersQuery }), users.listUsers)
userRoutes.get('/stats', canManage, users.userStats)
userRoutes.get('/:id', canManage, validate({ params: idParams }), users.getUser)
userRoutes.delete('/:id', canManage, validate({ params: idParams }), users.deleteUser)
