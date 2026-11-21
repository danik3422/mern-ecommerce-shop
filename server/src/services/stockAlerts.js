import { env } from '../config/env.js'
import { Product } from '../models/Product.js'
import { StockAlert } from '../models/StockAlert.js'
import { badRequest, conflict, notFound } from '../utils/HttpError.js'
import { toLocale } from '../utils/localized.js'
import { emailLanguage, renderEmail } from './emails/render.js'
import { sendMail } from './mailer.js'
import { findVariant } from './productView.js'
import { getShopSettings } from './shopSettings.js'

// a guard against filling someone else's inbox through the public form
const MAX_ACTIVE_ALERTS_PER_EMAIL = 20

/** Subscribes an email to a sold-out color and size of an active product. Idempotent. */
export const subscribeToRestock = async ({ productId, color, size, email, locale }) => {
	const product = await Product.findOne({ _id: productId, active: true }).lean()
	if (!product) throw notFound('Product')

	const variant = findVariant(product, color)
	if (!variant) throw badRequest('Please choose an available color')
	const variantSize = variant.sizes.find((s) => s.label === size)
	if (!variantSize) throw badRequest(`Size "${size}" is not available`)
	if (variantSize.stock > 0) throw conflict('This size is in stock — you can order it now')

	const active = await StockAlert.countDocuments({ email, notifiedAt: null })
	if (active >= MAX_ACTIVE_ALERTS_PER_EMAIL) {
		throw conflict('Too many active alerts for this email')
	}

	await StockAlert.updateOne(
		{ product: productId, color: variant.color, size, email },
		{ $set: { notifiedAt: null, locale: toLocale(locale) } },
		{ upsert: true },
	)
}

const productUrl = (product) => `${env.CLIENT_ORIGINS[0]}/product/${product.slug}`

/**
 * The back-in-stock email in the subscriber's language, without sending it.
 * @param alert `{ color, size }` of the stock alert
 */
export const buildBackInStockEmail = (product, alert, { locale, settings }) => {
	const { m } = emailLanguage(locale)
	const t = m.backInStock
	const vars = {
		product: `${product.brand} ${product.title}`,
		color: m.common.color(alert.color),
		size: m.common.size(alert.size),
	}
	return renderEmail(locale, settings, {
		subject: t.subject(vars),
		heading: t.heading,
		paragraphs: [t.intro(vars)],
		buttons: [{ label: t.button, url: productUrl(product) }],
		footnote: t.footnote,
	})
}

/**
 * Emails everyone waiting for a size of these products that has stock again.
 * Each alert is claimed atomically before sending, so an email goes out only once
 * even if two restocks happen at the same time. Failures are logged, never thrown:
 * a mail problem must not break the order or product update that triggered it.
 */
export const notifyRestocked = async (productIds) => {
	try {
		const ids = [...new Set(productIds.map(String))]
		const products = await Product.find({ _id: { $in: ids }, active: true }).lean()
		const settings = products.length ? await getShopSettings() : null

		for (const product of products) {
			const inStock = product.variants.flatMap((variant) =>
				variant.sizes
					.filter((size) => size.stock > 0)
					.map((size) => ({ color: variant.color, size: size.label })),
			)
			if (!inStock.length) continue

			const alerts = await StockAlert.find({
				product: product._id,
				notifiedAt: null,
				$or: inStock,
			}).lean()

			for (const alert of alerts) {
				const claimed = await StockAlert.findOneAndUpdate(
					{ _id: alert._id, notifiedAt: null },
					{ notifiedAt: new Date() },
				)
				if (!claimed) continue

				await sendMail({
					to: alert.email,
					...buildBackInStockEmail(product, alert, { locale: alert.locale, settings }),
				})
			}
		}
	} catch (err) {
		console.error('Could not send back-in-stock emails:', err)
	}
}
