/**
 * English email texts. Every key here exists in messages.pl.js as well.
 * Functions get the email's data and `f` (formatters for this language, see format.js).
 */
export default {
	common: {
		greeting: ({ name }) => (name ? `Hi ${name},` : 'Hi,'),
		signOff: ({ shopName }) => `Best wishes,\nThe ${shopName} team`,
		footer: ({ shopName, contactEmail }) =>
			contactEmail
				? `${shopName} · Questions? Reply to this email or write to ${contactEmail}.`
				: `${shopName} · Questions? Just reply to this email.`,
		// "black" → shown as is; sizes and colors are stored in English
		color: (color) => color,
		size: (size) => (size === 'One size' ? 'one size' : size),
		itemsTitle: ({ count }, f) =>
			f.plural(count, { one: 'Your order ({count} item)', other: 'Your order ({count} items)' }),
		subtotal: 'Items',
		discount: ({ code }) => (code ? `Discount (${code})` : 'Discount'),
		shipping: 'Delivery',
		free: 'free',
		total: 'Total',
		viewOrder: 'View your order',
		invoice: ({ number }) => `Invoice ${number}`,
		address: 'Delivery address',
	},

	order: {
		placed: {
			subject: ({ number }) => `We received your order ${number}`,
			heading: 'Thank you for your order!',
			intro: ({ date }) =>
				`We received your order on ${date}. We will let you know as soon as it ships.`,
		},
		paid: {
			subject: ({ number }) => `Payment received for order ${number}`,
			heading: 'Payment received',
			intro: ({ amount }) => `We received your payment of ${amount}. Your order is being prepared.`,
		},
		shipped: {
			subject: ({ number }) => `Your order ${number} is on its way`,
			heading: 'Your order is on its way',
			intro: ({ count }, f) =>
				f.plural(count, {
					one: 'Good news: your parcel with {count} item has left our warehouse.',
					other: 'Good news: your parcel with {count} items has left our warehouse.',
				}),
			trackingTitle: 'Parcel tracking',
			carrier: 'Carrier',
			trackingNumber: 'Tracking number',
			track: 'Track your parcel',
			noTracking: 'We will send you the tracking number as soon as the carrier assigns it.',
		},
		delivered: {
			subject: ({ number }) => `Your order ${number} has been delivered`,
			heading: 'Your order has been delivered',
			intro: 'We hope you enjoy it!',
			returns: ({ days }, f) =>
				f.plural(days, {
					one: 'Something does not fit? You can return it within {count} day of delivery.',
					other: 'Something does not fit? You can return it within {count} days of delivery.',
				}),
		},
		cancelled: {
			subject: ({ number }) => `Your order ${number} was cancelled`,
			heading: 'Your order was cancelled',
			intro: 'Your order was cancelled.',
			refund: 'The payment will be refunded to your original payment method within a few days.',
		},
	},

	carriers: {
		inpost: 'InPost',
		dpd: 'DPD',
		dhl: 'DHL',
		poczta: 'Poczta Polska',
		gls: 'GLS',
		other: 'Courier',
	},

	returns: {
		requested: {
			subject: ({ number }) => `We received your return request for order ${number}`,
			heading: 'Return request received',
			intro: 'We received your return request and will review it shortly.',
		},
		approved: {
			subject: ({ number }) => `Your return for order ${number} was approved`,
			heading: 'Return approved',
			intro: ({ count }, f) =>
				f.plural(count, {
					one: 'Your return was approved. Please send the item listed below back to us.',
					other: 'Your return was approved. Please send the {count} items listed below back to us.',
				}),
		},
		rejected: {
			subject: ({ number }) => `Your return for order ${number} was not accepted`,
			heading: 'Return not accepted',
			intro: 'Unfortunately we cannot accept this return.',
		},
		refunded: {
			subject: ({ number }) => `Refund for order ${number}`,
			heading: 'Your refund is on its way',
			intro: ({ amount, online }) =>
				online
					? `We received your return and refunded ${amount} to your original payment method.`
					: `We received your return and refunded ${amount}.`,
		},
		itemsTitle: 'Returned items',
		note: 'Note from the shop',
		refundAmount: 'Refund',
	},

	backInStock: {
		subject: ({ product, color, size }) => `Back in stock: ${product} (${color}, ${size})`,
		heading: 'It is back in stock',
		intro: ({ product, color, size }) =>
			`Good news: ${product} in ${color}, size ${size}, is available again. Popular sizes sell out fast.`,
		button: 'Order now',
		footnote:
			'You received this email because you asked to be notified. This was a one-time alert.',
	},
}
