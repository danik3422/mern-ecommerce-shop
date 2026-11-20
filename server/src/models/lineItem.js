import mongoose from 'mongoose'

/** A product with chosen options and quantity — shared by carts and orders. */
export const lineItemFields = {
	productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
	quantity: { type: Number, required: true, min: 1 },
	size: { type: String, required: true },
	color: String,
}
