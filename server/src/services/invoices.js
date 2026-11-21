import { CURRENCY } from '../config/shop.js'
import { Counter } from '../models/Counter.js'
import { Order } from '../models/Order.js'
import { formatBankAccount } from '../validation/taxIds.js'
import { VAT_RATE, allocate, fromGrosze, splitGross, sumLines, toGrosze } from './vat.js'

/**
 * VAT invoices ("Faktura VAT") for orders.
 *
 * An order gets an invoice number when it becomes paid (or delivered, for orders paid on
 * delivery): FV/YYYY/MM/NNNN, counting from 0001 every month. The number comes from a counter
 * document incremented atomically with $inc, so concurrent payments never share a number;
 * a unique index on `invoice.number` guards against duplicates as well.
 *
 * The invoice itself is not stored as a file: GET /orders/:id/invoice returns its data and the
 * client renders a print-optimised A4 page that customers save as PDF from the browser (no PDF
 * library needed, and Polish characters render with the page's own fonts).
 */

/** Order statuses in which an invoice exists (or is issued on first request for older orders). */
export const INVOICED_STATUSES = ['paid', 'shipped', 'delivered']

/** Invoice months follow the shop's time zone, so a payment at 00:30 on 1 May counts in May. */
const SHOP_TIME_ZONE = 'Europe/Warsaw'

const yearMonth = (date) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: SHOP_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
	}).formatToParts(date)
	const part = (type) => parts.find((p) => p.type === type).value
	return { year: part('year'), month: part('month') }
}

/**
 * The next invoice number for the month of `date`, e.g. "FV/2026/11/0007".
 * Atomic: every call gets a different number, even when called concurrently.
 */
export const nextInvoiceNumber = async (date = new Date()) => {
	const { year, month } = yearMonth(date)
	const id = `invoice/${year}/${month}`
	const increment = () =>
		Counter.findOneAndUpdate(
			{ _id: id },
			{ $inc: { seq: 1 } },
			{ upsert: true, returnDocument: 'after' },
		).lean()
	let counter
	try {
		counter = await increment()
	} catch (err) {
		// two first invoices of a month may race to create the counter; the loser simply retries
		if (err.code !== 11000) throw err
		counter = await increment()
	}
	return `FV/${year}/${month}/${String(counter.seq).padStart(4, '0')}`
}

/**
 * Gives the order an invoice if it has none yet. Safe to call repeatedly or concurrently:
 * only the first call stores a number.
 * @returns the order (a document or a plain object) with its `invoice`
 */
export const issueInvoice = async (order, now = new Date()) => {
	if (order.invoice?.number) return order
	const number = await nextInvoiceNumber(now)
	const saleDate = order.payment?.paidAt ?? order.deliveredAt ?? now
	const updated = await Order.findOneAndUpdate(
		{ _id: order._id, 'invoice.number': { $exists: false } },
		{ $set: { invoice: { number, issuedAt: now, saleDate } } },
		{ returnDocument: 'after' },
	)
	// issued meanwhile by another request (the number we took is left unused)
	return updated ?? Order.findById(order._id)
}

const money = fromGrosze

/** Invoice lines: products (with the order discount spread over them) and paid delivery. */
const invoiceLines = (order) => {
	const products = order.items.map((item) => ({
		kind: 'product',
		name: `${item.brand} ${item.title}`,
		color: item.color,
		size: item.size,
		quantity: item.quantity,
		unitPrice: toGrosze(item.price),
		value: toGrosze(item.price) * item.quantity,
	}))
	// the discount never exceeds the products' value (services/pricing.js)
	const discounts = allocate(
		products.map((line) => line.value),
		Math.min(
			toGrosze(order.discount ?? 0),
			products.reduce((sum, line) => sum + line.value, 0),
		),
	)
	const lines = products.map(({ value, ...line }, i) => ({
		...line,
		discount: discounts[i],
		...splitGross(value - discounts[i]),
	}))
	if (order.shipping > 0) {
		const shipping = toGrosze(order.shipping)
		lines.push({
			kind: 'shipping',
			name: order.shippingMethod?.label ?? 'Delivery',
			shippingMethodId: order.shippingMethod?.id,
			quantity: 1,
			unitPrice: shipping,
			discount: 0,
			...splitGross(shipping),
		})
	}
	return lines.map((line) => ({ ...line, vatRate: VAT_RATE }))
}

/**
 * Everything the invoice page shows (amounts in PLN).
 * @param order an order with an `invoice`
 * @param settings shop settings — the seller's company data
 */
export const buildInvoice = (order, settings) => {
	const company = settings.company
	const lines = invoiceLines(order)
	const totals = sumLines(lines)
	const toMoney = ({ unitPrice, discount, net, vat, gross, ...line }) => ({
		...line,
		unitPrice: money(unitPrice),
		discount: money(discount),
		net: money(net),
		vat: money(vat),
		gross: money(gross),
	})

	return {
		number: order.invoice.number,
		issueDate: order.invoice.issuedAt,
		saleDate: order.invoice.saleDate,
		placeOfIssue: company.city || undefined,
		currency: CURRENCY,
		order: {
			id: order._id.toString(),
			number: order._id.toString().slice(-8).toUpperCase(),
			placedAt: order.createdAt,
		},
		seller: {
			name: company.name || settings.shopName,
			street: company.street,
			postalCode: company.postalCode,
			city: company.city,
			nip: company.nip,
			bankAccount: formatBankAccount(company.bankAccount),
			email: settings.contactEmail,
			phone: settings.contactPhone,
		},
		buyer: { ...pick(order.address), email: order.email },
		payment: {
			// without online payment, customers pay the courier
			method: order.payment?.provider === 'stripe' ? 'online' : 'onDelivery',
			paid: Boolean(order.payment?.paidAt),
			paidAt: order.payment?.paidAt,
		},
		lines: lines.map(toMoney),
		totals: {
			net: money(totals.net),
			vat: money(totals.vat),
			gross: money(totals.gross),
			byRate: totals.byRate.map(({ rate, net, vat, gross }) => ({
				rate,
				net: money(net),
				vat: money(vat),
				gross: money(gross),
			})),
		},
	}
}

const pick = ({ fullName, street, postalCode, city, country }) => ({
	name: fullName,
	street,
	postalCode,
	city,
	country,
})
