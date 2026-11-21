import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { toLocale } from '../utils/localized.js'
import { emailLanguage, renderEmail } from './emails/render.js'
import { sendMail } from './mailer.js'
import { invoiceUrl, orderPageUrl } from './orderLinks.js'
import { getShopSettings } from './shopSettings.js'

export const ORDER_EMAIL_KINDS = ['placed', 'paid', 'shipped', 'delivered', 'cancelled']

export const orderNumber = (order) => `#${order._id.toString().slice(-8).toUpperCase()}`

/**
 * The language of a customer's emails about an order: chosen at checkout, else (orders
 * placed before orders stored it) the account's language, else English.
 */
export const orderLocale = async (order) => {
	if (order.locale) return toLocale(order.locale)
	if (!order.user) return 'en'
	const user = await User.findById(order.user).select('locale').lean()
	return toLocale(user?.locale)
}

const itemCount = (items) => items.reduce((sum, item) => sum + item.quantity, 0)

/** "Anna" from "Anna Kowalska" for the greeting. */
const firstName = (order) => order.address?.fullName?.trim().split(/\s+/)[0]

/** "1 × Northline Essential White Tee (biały, M)" */
export const itemLine = (item, m) =>
	`${item.quantity} × ${item.brand ? `${item.brand} ` : ''}${item.title} (${[
		item.color && m.common.color(item.color),
		m.common.size(item.size),
	]
		.filter(Boolean)
		.join(', ')})`

/** The delivery method's name in the customer's language, as edited in the shop settings. */
const shippingName = (order, settings, locale, m) => {
	const method = settings.shippingMethods.find((each) => each.id === order.shippingMethod?.id)
	return method?.label[locale] || order.shippingMethod?.label || m.common.shipping
}

/** Order lines with prices, then items, discount, delivery and total. */
const orderItems = (order, settings, { locale, m, f }) => ({
	title: m.common.itemsTitle({ count: itemCount(order.items) }, f),
	lines: order.items.map((item) => ({
		text: itemLine(item, m),
		amount: f.money(item.price * item.quantity),
	})),
	totals: [
		{ label: m.common.subtotal, value: f.money(order.subtotal) },
		order.discount
			? {
					label: m.common.discount({ code: order.promoCode }),
					value: `−${f.money(order.discount)}`,
				}
			: null,
		{
			label: shippingName(order, settings, locale, m),
			value: order.shipping ? f.money(order.shipping) : m.common.free,
		},
		{ label: m.common.total, value: f.money(order.amount), strong: true },
	].filter(Boolean),
})

const addressSection = (order, m) => {
	const { fullName, street, postalCode, city, country } = order.address ?? {}
	if (!fullName) return null
	return {
		title: m.common.address,
		rows: [fullName, street, `${postalCode} ${city}`, country].map((value) => ({ value })),
	}
}

/** Carrier, number and link of a shipped parcel (`order.tracking`, set by the admin). */
const trackingSection = (tracking, t, m) => ({
	title: t.trackingTitle,
	rows: [
		{ label: t.carrier, value: m.carriers[tracking.carrier] ?? tracking.carrier },
		{ label: t.trackingNumber, value: tracking.number },
	],
})

/**
 * The content of an order email (subject, text and HTML) without sending it.
 * @param kind one of ORDER_EMAIL_KINDS
 * @param options.locale 'en' | 'pl'
 * @param options.settings shop settings (shop name, delivery names, return window)
 */
export const buildOrderEmail = (order, kind, { locale, settings }) => {
	const language = emailLanguage(locale)
	const { m, f } = language
	const t = m.order[kind]
	const number = orderNumber(order)
	const count = itemCount(order.items)
	// customers open the order page in their account; guests get a link with the order's token
	const view = { label: m.common.viewOrder, url: orderPageUrl(order) }

	const content = {
		subject: t.subject({ number }),
		heading: t.heading,
		name: firstName(order),
		paragraphs: [],
		items: orderItems(order, settings, language),
		sections: [],
		buttons: [view],
	}

	if (kind === 'placed') {
		content.paragraphs.push(t.intro({ date: f.date(order.createdAt ?? new Date()) }))
		content.sections.push(addressSection(order, m))
	} else if (kind === 'paid') {
		content.paragraphs.push(t.intro({ amount: f.money(order.amount) }))
	} else if (kind === 'shipped') {
		content.paragraphs.push(t.intro({ count }, f))
		if (order.tracking?.number) {
			content.sections.push(trackingSection(order.tracking, t, m))
			if (order.tracking.url) content.buttons.unshift({ label: t.track, url: order.tracking.url })
		} else {
			content.paragraphs.push(t.noTracking)
		}
		content.sections.push(addressSection(order, m))
	} else if (kind === 'delivered') {
		content.paragraphs.push(t.intro, t.returns({ days: settings.returnWindowDays }, f))
	} else if (kind === 'cancelled') {
		content.paragraphs.push(t.intro)
		if (order.payment?.paidAt) content.paragraphs.push(t.refund)
	}
	// the invoice is issued when the order is paid (see services/invoices.js)
	if (['paid', 'delivered'].includes(kind) && order.invoice?.number) {
		content.buttons.push({
			label: m.common.invoice({ number: order.invoice.number }),
			url: invoiceUrl(order),
		})
	}
	content.sections = content.sections.filter(Boolean)

	return renderEmail(language.locale, settings, content)
}

/**
 * Emails the customer about their order, in the order's language. Never throws: a mail
 * problem must not undo an order or a status change.
 * @param kind 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
 */
export const sendOrderEmail = async (orderOrId, kind) => {
	try {
		if (!ORDER_EMAIL_KINDS.includes(kind)) return
		const order =
			typeof orderOrId === 'object' && orderOrId.accessToken !== undefined
				? orderOrId
				: await Order.findById(orderOrId._id ?? orderOrId)
						.select('+accessToken')
						.lean()
		if (!order?.email) return

		const [locale, settings] = await Promise.all([orderLocale(order), getShopSettings()])
		await sendMail({ to: order.email, ...buildOrderEmail(order, kind, { locale, settings }) })
	} catch (err) {
		console.error(`Could not send the "${kind}" email:`, err)
	}
}
