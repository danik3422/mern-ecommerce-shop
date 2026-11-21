import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
	{
		product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		// copied so reviews stay readable after the account is renamed or deleted
		username: { type: String, required: true },
		rating: { type: Number, required: true, min: 1, max: 5 },
		title: { type: String, trim: true, maxlength: 120 },
		body: { type: String, required: true, trim: true, maxlength: 2000 },
		// optional fit feedback: runs small, true to size or runs large
		fit: { type: String, enum: ['small', 'true', 'large'] },
		// the size the reviewer bought, one of the product's sizes
		sizeBought: { type: String, trim: true, maxlength: 20 },
	},
	{ timestamps: true, versionKey: false },
)

// one review per user and product
reviewSchema.index({ product: 1, user: 1 }, { unique: true })

export const Review = mongoose.model('Review', reviewSchema)
