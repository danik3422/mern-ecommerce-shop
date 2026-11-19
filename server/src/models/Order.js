import mongoose from 'mongoose'
import { lineItemFields } from './lineItem.js'

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

// Title and price are copied at purchase time, so later product edits don't change past orders
const orderItemSchema = new mongoose.Schema(
	{
		...lineItemFields,
		title: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
	},
	{ _id: false },
)

const addressSchema = new mongoose.Schema(
	{
		fullName: { type: String, required: true },
		street: { type: String, required: true },
		city: { type: String, required: true },
		postalCode: { type: String, required: true },
		country: { type: String, required: true },
	},
	{ _id: false },
)

const orderSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		items: { type: [orderItemSchema], required: true },
		subtotal: { type: Number, required: true, min: 0 },
		shipping: { type: Number, required: true, min: 0 },
		// subtotal + shipping — what the customer pays
		amount: { type: Number, required: true, min: 0 },
		address: { type: addressSchema, required: true },
		status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
	},
	{ timestamps: true, versionKey: false },
)

export const Order = mongoose.model('Order', orderSchema)
