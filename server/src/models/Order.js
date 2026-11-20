import mongoose from 'mongoose'
import { addressFields } from './address.js'
import { lineItemFields } from './lineItem.js'

/**
 * pending   — created, waiting for payment (stock is reserved)
 * paid      — payment confirmed
 * shipped / delivered — fulfilment
 * cancelled — stock returned
 */
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']

// Product data is copied at purchase time, so later edits don't change past orders
const orderItemSchema = new mongoose.Schema(
	{
		...lineItemFields,
		title: { type: String, required: true },
		brand: { type: String, required: true },
		image: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
	},
	{ _id: false },
)

const paymentSchema = new mongoose.Schema(
	{
		provider: { type: String, enum: ['stripe', 'none'], default: 'none' },
		// Stripe Checkout Session id
		sessionId: { type: String, index: true, sparse: true },
		paidAt: Date,
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
		address: { type: new mongoose.Schema(addressFields, { _id: false }), required: true },
		status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
		payment: { type: paymentSchema, default: () => ({}) },
	},
	{ timestamps: true, versionKey: false },
)

export const Order = mongoose.model('Order', orderSchema)
