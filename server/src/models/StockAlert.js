import mongoose from 'mongoose'

/** "Tell me when this size is back" — one alert per product, color, size and email. */
const stockAlertSchema = new mongoose.Schema(
	{
		product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
		color: { type: String, required: true },
		size: { type: String, required: true },
		email: { type: String, required: true, lowercase: true, trim: true },
		// set once the email has been sent; subscribing again resets it
		notifiedAt: { type: Date, default: null },
	},
	{ timestamps: true, versionKey: false },
)

stockAlertSchema.index({ product: 1, color: 1, size: 1, email: 1 }, { unique: true })
stockAlertSchema.index({ product: 1, notifiedAt: 1 })

export const StockAlert = mongoose.model('StockAlert', stockAlertSchema)
