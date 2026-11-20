import mongoose from 'mongoose'

/** Every variant has at least one size; one-size items use the label "One size". */
const sizeSchema = new mongoose.Schema(
	{
		label: { type: String, required: true, trim: true },
		stock: { type: Number, required: true, min: 0, default: 0 },
	},
	{ _id: false },
)

/** A color of the product with its own photos and stock per size. */
const variantSchema = new mongoose.Schema(
	{
		color: { type: String, required: true, trim: true, lowercase: true },
		images: {
			type: [String],
			validate: [(images) => images.length > 0, 'At least one image is required'],
		},
		sizes: {
			type: [sizeSchema],
			validate: [(sizes) => sizes.length > 0, 'At least one size is required'],
		},
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
		categories: { type: [String], index: true },
		variants: {
			type: [variantSchema],
			validate: [(variants) => variants.length > 0, 'At least one color is required'],
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

productSchema.index({ 'variants.color': 1 })
productSchema.index({ 'variants.sizes.label': 1 })

export const Product = mongoose.model('Product', productSchema)
