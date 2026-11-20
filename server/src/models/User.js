import mongoose from 'mongoose'
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
		isAdmin: { type: Boolean, default: false },
		addresses: { type: [savedAddressSchema], default: [] },
		wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
	},
	{
		timestamps: true,
		versionKey: false,
		toJSON: {
			transform: (_doc, ret) => {
				delete ret.passwordHash
				return ret
			},
		},
	},
)

export const User = mongoose.model('User', userSchema)
