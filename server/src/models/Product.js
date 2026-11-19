import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, unique: true, trim: true },
		description: { type: String, required: true },
		img: { type: String, required: true },
		categories: { type: [String], index: true },
		size: { type: [String], default: [] },
		color: { type: [String], default: [] },
		price: { type: Number, required: true, min: 0 },
		inStock: { type: Boolean, default: true },
	},
	{ timestamps: true, versionKey: false },
)

export const Product = mongoose.model('Product', productSchema)
