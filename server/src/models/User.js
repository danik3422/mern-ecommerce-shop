import mongoose from 'mongoose'
import { PERMISSION_NAMES } from '../services/permissions.js'
import { addressFields } from './address.js'

const savedAddressSchema = new mongoose.Schema(
	{ ...addressFields, isDefault: { type: Boolean, default: false } },
	{ timestamps: false },
)

const userSchema = new mongoose.Schema(
	{
		username: { type: String, required: true, unique: true, trim: true },
		email: { type: String, required: true, unique: true, trim: true, lowercase: true },
		passwordHash: { type: String, required: true, select: false },
		// customer: signed up in the shop; staff: created in the admin panel (Team)
		role: { type: String, enum: ['customer', 'staff'], default: 'customer', index: true },
		// staff only: areas of the admin panel, see services/permissions.js
		permissions: { type: [{ type: String, enum: PERMISSION_NAMES }], default: undefined },
		// staff with full access, the only ones who may manage owners
		isOwner: { type: Boolean, default: undefined },
		// blocked (deactivated) accounts cannot sign in, and their existing sessions stop working
		blocked: { type: Boolean, default: false },
		lastLoginAt: Date,
		addresses: { type: [savedAddressSchema], default: [] },
		wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: {
			transform: (doc, ret) => {
				delete ret.passwordHash
				// compatibility flag for the client: any staff account may open the admin panel
				ret.isAdmin = doc.role === 'staff'
				return ret
			},
		},
	},
)

/** For lean documents, which skip toJSON: drops the hash and adds the `isAdmin` flag. */
export const toPublicUser = ({ passwordHash: _hash, ...user }) => ({
	...user,
	isAdmin: user.role === 'staff',
})

export const User = mongoose.model('User', userSchema)
