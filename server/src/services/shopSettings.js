import { CURRENCY, SHOP_DEFAULTS } from '../config/shop.js'
import { SHOP_SETTINGS_ID, ShopSettings } from '../models/ShopSettings.js'

/**
 * Shop settings: stored in MongoDB, edited in the admin panel, cached in memory.
 *
 * Shape (also what GET /api/admin/settings returns):
 * `{ currency, shopName, contactEmail, contactPhone, announcement: { en, pl },
 *    company: { name, street, postalCode, city, nip, bankAccount },
 *    freeShippingFrom (number | null), returnWindowDays, lowStockThreshold,
 *    shippingMethods: [{ id, label: { en, pl }, price, freeShipping, days: [min, max], enabled }] }`
 */

let cached

/**
 * Stored values over the defaults, so settings saved by an older version (or never saved)
 * are always complete. Delivery methods always come in the fixed order of their ids.
 */
const withDefaults = (stored = {}) => {
	const storedMethods = new Map((stored.shippingMethods ?? []).map((m) => [m.id, m]))
	return {
		currency: CURRENCY,
		shopName: stored.shopName ?? SHOP_DEFAULTS.shopName,
		contactEmail: stored.contactEmail ?? SHOP_DEFAULTS.contactEmail,
		contactPhone: stored.contactPhone ?? SHOP_DEFAULTS.contactPhone,
		announcement: { ...SHOP_DEFAULTS.announcement, ...stored.announcement },
		company: { ...SHOP_DEFAULTS.company, ...stored.company },
		freeShippingFrom:
			stored.freeShippingFrom === undefined
				? SHOP_DEFAULTS.freeShippingFrom
				: stored.freeShippingFrom || null,
		returnWindowDays: stored.returnWindowDays ?? SHOP_DEFAULTS.returnWindowDays,
		lowStockThreshold: stored.lowStockThreshold ?? SHOP_DEFAULTS.lowStockThreshold,
		shippingMethods: SHOP_DEFAULTS.shippingMethods.map((defaults) => {
			const method = storedMethods.get(defaults.id) ?? {}
			return {
				id: defaults.id,
				label: { ...defaults.label, ...method.label },
				price: method.price ?? defaults.price,
				freeShipping: method.freeShipping ?? defaults.freeShipping,
				days: method.days?.length === 2 ? [...method.days] : [...defaults.days],
				enabled: method.enabled ?? defaults.enabled,
			}
		}),
	}
}

/**
 * The current settings (a fresh copy, safe to modify).
 * Loaded from the database once, then served from memory until they are updated
 * (the API runs as a single process, so the cache cannot go stale).
 */
export const getShopSettings = async () => {
	if (!cached) {
		const loading = ShopSettings.findById(SHOP_SETTINGS_ID)
			.lean()
			.then((doc) => withDefaults(doc ?? undefined))
		// a failed load is not cached, so the next call tries again
		loading.catch(() => {
			if (cached === loading) cached = undefined
		})
		cached = loading
	}
	return structuredClone(await cached)
}

/**
 * Saves new settings (validated by validation/settings.js) and returns the result.
 * @param changes any top-level settings fields; delivery methods are matched by id
 */
export const updateShopSettings = async (changes) => {
	const current = await getShopSettings()
	const next = withDefaults({ ...current, ...changes })
	if (changes.shippingMethods) {
		const updates = new Map(changes.shippingMethods.map((method) => [method.id, method]))
		next.shippingMethods = current.shippingMethods.map((method) => ({
			...method,
			...updates.get(method.id),
		}))
	}
	const { currency: _currency, ...stored } = next

	await ShopSettings.findByIdAndUpdate(SHOP_SETTINGS_ID, stored, {
		upsert: true,
		runValidators: true,
	})
	cached = Promise.resolve(next)
	return structuredClone(next)
}

/** Forgets the cached settings — for tests, which clear the database between cases. */
export const clearShopSettingsCache = () => {
	cached = undefined
}

/** A delivery method that customers can choose, or undefined when it is unknown or disabled. */
export const findEnabledShippingMethod = (settings, id) =>
	settings.shippingMethods.find((method) => method.id === id && method.enabled)

/**
 * Settings the storefront needs (GET /api/shop/config): only enabled delivery methods.
 * `label` stays the English name for older clients; `labels` has every language.
 */
export const toPublicShopConfig = (settings) => ({
	currency: settings.currency,
	freeShippingFrom: settings.freeShippingFrom,
	returnWindowDays: settings.returnWindowDays,
	shippingMethods: settings.shippingMethods
		.filter((method) => method.enabled)
		.map(({ id, label, price, freeShipping, days }) => ({
			id,
			label: label.en,
			labels: label,
			price,
			freeShipping,
			days,
		})),
	shopName: settings.shopName,
	contact: { email: settings.contactEmail, phone: settings.contactPhone },
	announcement: settings.announcement.en || settings.announcement.pl ? settings.announcement : null,
	lowStockThreshold: settings.lowStockThreshold,
})
