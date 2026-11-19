import mongoose from 'mongoose'
import { lineItemFields } from './lineItem.js'

const cartSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
		items: [new mongoose.Schema(lineItemFields, { _id: false })],
	},
	{ timestamps: true, versionKey: false },
)

export const Cart = mongoose.model('Cart', cartSchema)
