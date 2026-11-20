/** Shipping address fields shared by user address books and orders. */
export const addressFields = {
	fullName: { type: String, required: true, trim: true },
	street: { type: String, required: true, trim: true },
	city: { type: String, required: true, trim: true },
	postalCode: { type: String, required: true, trim: true },
	country: { type: String, required: true, trim: true },
}
