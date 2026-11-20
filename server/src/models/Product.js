import mongoose from 'mongoose'

/** Every product has at least one size; one-size items use the label "One size". */
const sizeSchema = new mongoose.Schema(
	{
		label: { type: String, required: true, trim: true },
		stock: { type: Number, required: true, min: 0, default: 0 },
	},
	{ _id: false },
)

const productSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true },
		// URL-friendly unique name, e.g. "classic-jeans"
		slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
		brand: { type: String, required: true, trim: true, index: true },
		description: { type: String, required: true },
		images: {
			type: [String],
			validate: [(images) => images.length > 0, 'At least one image is required'],
		},
		categories: { type: [String], index: true },
		colors: { type: [String], default: [] },
		sizes: {
			type: [sizeSchema],
			validate: [(sizes) => sizes.length > 0, 'At least one size is required'],
		},
		price: { type: Number, required: true, min: 0 },
		// the price before a discount; shown crossed out when higher than `price`
		compareAtPrice: { type: Number, min: 0 },
		// hidden products are visible to admins only
		active: { type: Boolean, default: true, index: true },
		// kept in sync by the reviews service
		rating: {
			average: { type: Number, default: 0, min: 0, max: 5 },
			count: { type: Number, default: 0, min: 0 },
		},
	},
	{ timestamps: true, versionKey: false },
)

export const Product = mongoose.model('Product', productSchema)
