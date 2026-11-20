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
		// needed for refunds
		paymentIntentId: String,
		paidAt: Date,
		// total refunded so far (cancellations and returns)
		refunded: { type: Number, min: 0, default: 0 },
	},
	{ _id: false },
)

export const RETURN_REASONS = [
	'too_small',
	'too_big',
	'not_as_described',
	'damaged',
	'changed_mind',
	'other',
]

/**
 * requested → approved (send the parcel back) | rejected
 * approved → refunded (items received: stock returned, money refunded)
 */
export const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'refunded']

const returnRequestSchema = new mongoose.Schema(
	{
		status: { type: String, enum: RETURN_STATUSES, default: 'requested' },
		items: [
			new mongoose.Schema(
				{
					productId: { type: mongoose.Schema.Types.ObjectId, required: true },
					color: String,
					size: { type: String, required: true },
					quantity: { type: Number, required: true, min: 1 },
					title: String,
					price: Number,
				},
				{ _id: false },
			),
		],
		reason: { type: String, enum: RETURN_REASONS, required: true },
		comment: String,
		// message from the shop, e.g. why a return was rejected
		note: String,
		refundAmount: { type: Number, min: 0 },
		// true when the refund went through Stripe; false: the shop refunds manually
		refundedOnline: Boolean,
		requestedAt: { type: Date, default: Date.now },
		decidedAt: Date,
		refundedAt: Date,
	},
	{ _id: false },
)

const orderSchema = new mongoose.Schema(
	{
		// empty for guest orders
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
		// where order emails go: the account email or the one a guest entered
		email: { type: String, required: true, lowercase: true, trim: true, index: true },
		// lets a guest open, pay or cancel the order (see services/orderAccess.js)
		accessToken: { type: String, select: false },
		items: { type: [orderItemSchema], required: true },
		subtotal: { type: Number, required: true, min: 0 },
		discount: { type: Number, min: 0, default: 0 },
		promoCode: String,
		shipping: { type: Number, required: true, min: 0 },
		shippingMethod: {
			type: new mongoose.Schema({ id: String, label: String, price: Number }, { _id: false }),
		},
		// subtotal - discount + shipping — what the customer pays
		amount: { type: Number, required: true, min: 0 },
		address: { type: new mongoose.Schema(addressFields, { _id: false }), required: true },
		status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
		payment: { type: paymentSchema, default: () => ({}) },
		shippedAt: Date,
		deliveredAt: Date,
		returnRequest: returnRequestSchema,
	},
	{ timestamps: true, versionKey: false },
)

export const Order = mongoose.model('Order', orderSchema)
