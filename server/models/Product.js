const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, unique: true },
		description: { type: String, required: true },
		img: { type: String, required: true },
		categories: { type: [String], index: true },
		size: { type: [String] },
		color: { type: [String] },
		price: { type: Number, required: true, min: 0 },
		inStock: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Product', productSchema)
