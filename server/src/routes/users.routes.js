import { Router } from 'express'
import * as users from '../controllers/users.controller.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../validation/common.js'
import { listUsersQuery, updateMeBody, updateUserBody } from '../validation/user.js'

export const userRoutes = Router()

// signed-in user: own account
userRoutes.get('/me', requireAuth, users.getMe)
userRoutes.patch('/me', requireAuth, validate({ body: updateMeBody }), users.updateMe)
userRoutes.delete('/me', requireAuth, users.deleteMe)

// admin
userRoutes.get('/', requireAdmin, validate({ query: listUsersQuery }), users.listUsers)
userRoutes.get('/stats', requireAdmin, users.userStats)
userRoutes.get('/:id', requireAdmin, validate({ params: idParams }), users.getUser)
userRoutes.patch(
	'/:id',
	requireAdmin,
	validate({ params: idParams, body: updateUserBody }),
	users.updateUser,
)
userRoutes.delete('/:id', requireAdmin, validate({ params: idParams }), users.deleteUser)
