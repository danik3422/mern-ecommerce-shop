import { env } from '../config/env.js'
import { Product } from '../models/Product.js'
import { StockAlert } from '../models/StockAlert.js'
import { badRequest, conflict, notFound } from '../utils/HttpError.js'
import { sendMail } from './mailer.js'

// a guard against filling someone else's inbox through the public form
const MAX_ACTIVE_ALERTS_PER_EMAIL = 20

/** Subscribes an email to a sold-out size of an active product. Idempotent. */
export const subscribeToRestock = async ({ productId, size, email }) => {
	const product = await Product.findOne({ _id: productId, active: true }).lean()
	if (!product) throw notFound('Product')

	const productSize = product.sizes.find((s) => s.label === size)
	if (!productSize) throw badRequest(`Size "${size}" is not available`)
	if (productSize.stock > 0) throw conflict('This size is in stock — you can order it now')

	const active = await StockAlert.countDocuments({ email, notifiedAt: null })
	if (active >= MAX_ACTIVE_ALERTS_PER_EMAIL) {
		throw conflict('Too many active alerts for this email')
	}

	await StockAlert.updateOne(
		{ product: productId, size, email },
		{ $set: { notifiedAt: null } },
		{ upsert: true },
	)
}

const productUrl = (product) => `${env.CLIENT_ORIGINS[0]}/product/${product.slug}`

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

		for (const product of products) {
			const sizesInStock = product.sizes.filter((s) => s.stock > 0).map((s) => s.label)
			if (!sizesInStock.length) continue

			const alerts = await StockAlert.find({
				product: product._id,
				size: { $in: sizesInStock },
				notifiedAt: null,
			}).lean()

			for (const alert of alerts) {
				const claimed = await StockAlert.findOneAndUpdate(
					{ _id: alert._id, notifiedAt: null },
					{ notifiedAt: new Date() },
				)
				if (!claimed) continue

				await sendMail({
					to: alert.email,
					subject: `Back in stock: ${product.brand} ${product.title} (${alert.size})`,
					text: [
						`Good news — ${product.brand} ${product.title} in size ${alert.size} is available again.`,
						'',
						`Order it here: ${productUrl(product)}`,
						'',
						'You received this email because you asked to be notified. This was a one-time alert.',
					].join('\n'),
				})
			}
		}
	} catch (err) {
		console.error('Could not send back-in-stock emails:', err)
	}
}
