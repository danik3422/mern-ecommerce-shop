import mongoose from 'mongoose'
import { SHIPPING_METHOD_IDS, SHOP_DEFAULTS } from '../config/shop.js'

/** The id of the only settings document. */
export const SHOP_SETTINGS_ID = 'shop'

const translatedText = (defaults) =>
	new mongoose.Schema(
		{
			en: { type: String, trim: true, default: defaults.en },
			pl: { type: String, trim: true, default: defaults.pl },
		},
		{ _id: false },
	)

const shippingMethodSchema = new mongoose.Schema(
	{
		id: { type: String, enum: SHIPPING_METHOD_IDS, required: true },
		label: { type: translatedText({ en: '', pl: '' }), required: true },
		price: { type: Number, min: 0, required: true },
		// ships for free from the free-shipping threshold
		freeShipping: { type: Boolean, default: true },
		// delivery time in working days: [min, max]
		days: { type: [Number], required: true },
		// disabled methods are hidden in the shop and rejected at checkout
		enabled: { type: Boolean, default: true },
	},
	{ _id: false },
)

/**
 * Shop settings editable in the admin panel — a single document with the id "shop".
 * Read them through services/shopSettings.js, which fills in defaults and caches them.
 */
const shopSettingsSchema = new mongoose.Schema(
	{
		_id: { type: String, default: SHOP_SETTINGS_ID },
		shopName: { type: String, trim: true, default: SHOP_DEFAULTS.shopName },
		contactEmail: { type: String, trim: true, default: SHOP_DEFAULTS.contactEmail },
		contactPhone: { type: String, trim: true, default: SHOP_DEFAULTS.contactPhone },
		announcement: {
			type: translatedText(SHOP_DEFAULTS.announcement),
			default: () => ({ ...SHOP_DEFAULTS.announcement }),
		},
		// null = no free shipping
		freeShippingFrom: { type: Number, min: 0, default: SHOP_DEFAULTS.freeShippingFrom },
		returnWindowDays: { type: Number, min: 1, default: SHOP_DEFAULTS.returnWindowDays },
		lowStockThreshold: { type: Number, min: 0, default: SHOP_DEFAULTS.lowStockThreshold },
		shippingMethods: {
			type: [shippingMethodSchema],
			default: () => structuredClone(SHOP_DEFAULTS.shippingMethods),
		},
	},
	{ timestamps: true, versionKey: false },
)

export const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema)
