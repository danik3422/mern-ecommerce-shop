import { User } from '../models/User.js'
import { conflict, forbidden, notFound } from '../utils/HttpError.js'
import { hashPassword } from './password.js'
import { PERMISSION_NAMES, hasPermission } from './permissions.js'

/**
 * Staff accounts, managed by staff with the "team" permission.
 *
 * Safety rules:
 * - nobody can block, delete, demote or take "team" away from themselves;
 * - only owners can create owners or change, reset or remove an owner;
 * - non-owners can grant only permissions they have themselves (no escalation);
 * - the last active owner cannot be demoted, blocked or removed.
 */

const STAFF_FIELDS = 'username email role isOwner permissions blocked lastLoginAt createdAt'

const toStaff = (user) => ({
	_id: user._id,
	username: user.username,
	email: user.email,
	isOwner: Boolean(user.isOwner),
	permissions: user.isOwner ? PERMISSION_NAMES : (user.permissions ?? []),
	blocked: Boolean(user.blocked),
	lastLoginAt: user.lastLoginAt ?? null,
	createdAt: user.createdAt,
})

export const listStaff = async () => {
	const staff = await User.find({ role: 'staff' })
		.select(STAFF_FIELDS)
		.sort({ createdAt: 1 })
		.lean()
	return staff.map(toStaff)
}

const findStaff = async (id) => {
	const user = await User.findOne({ _id: id, role: 'staff' })
	if (!user) throw notFound('Staff member')
	return user
}

/** Non-owners may hand out only what they can do themselves. */
const ensureCanGrant = (actor, permissions) => {
	if (actor.isOwner) return
	const missing = permissions.filter((name) => !hasPermission(actor, name))
	if (missing.length)
		throw forbidden(`You cannot grant permissions you do not have: ${missing.join(', ')}`)
}

const ensureCanManage = (actor, target) => {
	if (target.isOwner && !actor.isOwner) throw forbidden('Only owners can change an owner')
}

/** Throws when `target` is the only owner who can still sign in. */
const ensureAnotherOwner = async (target) => {
	if (!target.isOwner || target.blocked) return
	const others = await User.countDocuments({
		_id: { $ne: target._id },
		role: 'staff',
		isOwner: true,
		blocked: { $ne: true },
	})
	if (!others) throw conflict('The shop needs at least one active owner')
}

const ensureFree = async ({ username, email }) => {
	const taken = await User.exists({ $or: [{ username }, { email }] })
	if (taken) throw conflict('Username or email is already taken')
}

/** @param actor req.user */
export const createStaff = async ({ username, email, password, permissions, isOwner }, actor) => {
	if (isOwner && !actor.isOwner) throw forbidden('Only owners can create owners')
	ensureCanGrant(actor, permissions)
	await ensureFree({ username, email })

	const user = await User.create({
		username,
		email,
		passwordHash: await hashPassword(password),
		role: 'staff',
		isOwner,
		permissions: isOwner ? PERMISSION_NAMES : permissions,
	})
	return toStaff(user)
}

/** `{ permissions?, isOwner?, blocked? }` */
export const updateStaff = async (id, changes, actor) => {
	const target = await findStaff(id)
	const isSelf = target.id === actor.id
	ensureCanManage(actor, target)

	if (isSelf) {
		if (changes.blocked) throw forbidden('You cannot deactivate your own account')
		if (changes.isOwner === false && target.isOwner) {
			throw forbidden('You cannot remove your own owner role')
		}
		if (changes.permissions && !target.isOwner && !changes.permissions.includes('team')) {
			throw forbidden('You cannot remove your own "team" permission')
		}
	}
	if (changes.isOwner !== undefined && changes.isOwner !== Boolean(target.isOwner)) {
		if (!actor.isOwner) throw forbidden('Only owners can change who is an owner')
	}
	if (changes.permissions) ensureCanGrant(actor, changes.permissions)
	if (changes.isOwner === false || changes.blocked) await ensureAnotherOwner(target)

	if (changes.isOwner !== undefined) target.isOwner = changes.isOwner
	if (changes.blocked !== undefined) target.blocked = changes.blocked
	if (target.isOwner) target.permissions = PERMISSION_NAMES
	else if (changes.permissions) target.permissions = changes.permissions
	await target.save()
	return toStaff(target)
}

/** Sets a new temporary password, e.g. when a staff member forgot theirs. */
export const resetStaffPassword = async (id, password, actor) => {
	const target = await findStaff(id)
	ensureCanManage(actor, target)
	target.passwordHash = await hashPassword(password)
	await target.save()
	return toStaff(target)
}

export const deleteStaff = async (id, actor) => {
	const target = await findStaff(id)
	if (target.id === actor.id) throw forbidden('You cannot delete your own account here')
	ensureCanManage(actor, target)
	await ensureAnotherOwner(target)
	await target.deleteOne()
	return toStaff(target)
}
