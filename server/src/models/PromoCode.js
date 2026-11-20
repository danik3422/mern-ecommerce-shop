import mongoose from 'mongoose'

export const PROMO_TYPES = ['percent', 'fixed', 'free_shipping']

const promoCodeSchema = new mongoose.Schema(
	{
		// stored upper-case; customers may type it in any case
		code: { type: String, required: true, unique: true, uppercase: true, trim: true },
		description: { type: String, trim: true, default: '' },
		type: { type: String, enum: PROMO_TYPES, required: true },
		// percent: 1..100, fixed: amount off the subtotal, free_shipping: unused
		value: { type: Number, min: 0, default: 0 },
		minSubtotal: { type: Number, min: 0, default: 0 },
		startsAt: Date,
		endsAt: Date,
		// unlimited when not set
		maxUses: { type: Number, min: 1 },
		usedCount: { type: Number, min: 0, default: 0 },
		active: { type: Boolean, default: true },
	},
	{ timestamps: true, versionKey: false },
)

export const PromoCode = mongoose.model('PromoCode', promoCodeSchema)
