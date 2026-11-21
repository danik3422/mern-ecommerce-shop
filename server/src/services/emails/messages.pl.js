/**
 * Polish email texts (same keys as messages.en.js).
 * Sentences avoid grammatical gender of the customer and of product names, which the shop
 * does not know (e.g. "znowu jest w sprzedaży" instead of "jest znowu dostępny/dostępna").
 */
const COLORS = {
	white: 'biały',
	black: 'czarny',
	beige: 'beżowy',
	gray: 'szary',
	blue: 'niebieski',
	brown: 'brązowy',
	pink: 'różowy',
	green: 'zielony',
	red: 'czerwony',
	orange: 'pomarańczowy',
	yellow: 'żółty',
}

export default {
	common: {
		greeting: ({ name }) => (name ? `Dzień dobry, ${name}!` : 'Dzień dobry!'),
		signOff: ({ shopName }) => `Pozdrawiamy,\nzespół ${shopName}`,
		footer: ({ shopName, contactEmail }) =>
			contactEmail
				? `${shopName} · Masz pytania? Odpowiedz na tę wiadomość albo napisz na ${contactEmail}.`
				: `${shopName} · Masz pytania? Po prostu odpowiedz na tę wiadomość.`,
		color: (color) => COLORS[color] ?? color,
		size: (size) => (size === 'One size' ? 'rozmiar uniwersalny' : size),
		itemsTitle: ({ count }, f) =>
			f.plural(count, {
				one: 'Twoje zamówienie ({count} sztuka)',
				few: 'Twoje zamówienie ({count} sztuki)',
				many: 'Twoje zamówienie ({count} sztuk)',
				other: 'Twoje zamówienie ({count} sztuki)',
			}),
		subtotal: 'Wartość produktów',
		discount: ({ code }) => (code ? `Rabat (${code})` : 'Rabat'),
		shipping: 'Dostawa',
		free: 'gratis',
		total: 'Razem',
		viewOrder: 'Zobacz zamówienie',
		invoice: ({ number }) => `Faktura ${number}`,
		address: 'Adres dostawy',
	},

	order: {
		placed: {
			subject: ({ number }) => `Otrzymaliśmy Twoje zamówienie ${number}`,
			heading: 'Dziękujemy za zamówienie!',
			intro: ({ date }) =>
				`Twoje zamówienie z dnia ${date} zostało przyjęte. Damy Ci znać, gdy tylko je wyślemy.`,
		},
		paid: {
			subject: ({ number }) => `Otrzymaliśmy płatność za zamówienie ${number}`,
			heading: 'Płatność przyjęta',
			intro: ({ amount }) =>
				`Otrzymaliśmy Twoją płatność w wysokości ${amount}. Właśnie kompletujemy zamówienie.`,
		},
		shipped: {
			subject: ({ number }) => `Twoje zamówienie ${number} jest już w drodze`,
			heading: 'Zamówienie jest w drodze',
			intro: ({ count }, f) =>
				f.plural(count, {
					one: 'Dobra wiadomość: paczka z {count} sztuką opuściła nasz magazyn.',
					few: 'Dobra wiadomość: paczka z {count} sztukami opuściła nasz magazyn.',
					many: 'Dobra wiadomość: paczka z {count} sztukami opuściła nasz magazyn.',
					other: 'Dobra wiadomość: paczka z {count} sztuki opuściła nasz magazyn.',
				}),
			trackingTitle: 'Śledzenie przesyłki',
			carrier: 'Przewoźnik',
			trackingNumber: 'Numer przesyłki',
			track: 'Śledź przesyłkę',
			noTracking: 'Numer przesyłki prześlemy, gdy tylko nada go przewoźnik.',
		},
		delivered: {
			subject: ({ number }) => `Zamówienie ${number} zostało dostarczone`,
			heading: 'Zamówienie dostarczone',
			intro: 'Mamy nadzieję, że wszystko Ci się spodoba!',
			returns: ({ days }, f) =>
				f.plural(days, {
					one: 'Coś nie pasuje? Możesz to zwrócić w ciągu {count} dnia od dostawy.',
					few: 'Coś nie pasuje? Możesz to zwrócić w ciągu {count} dni od dostawy.',
					many: 'Coś nie pasuje? Możesz to zwrócić w ciągu {count} dni od dostawy.',
					other: 'Coś nie pasuje? Możesz to zwrócić w ciągu {count} dnia od dostawy.',
				}),
		},
		cancelled: {
			subject: ({ number }) => `Zamówienie ${number} zostało anulowane`,
			heading: 'Zamówienie anulowane',
			intro: 'Twoje zamówienie zostało anulowane.',
			refund: 'Pieniądze wrócą na Twoją pierwotną metodę płatności w ciągu kilku dni.',
		},
	},

	carriers: {
		inpost: 'InPost',
		dpd: 'DPD',
		dhl: 'DHL',
		poczta: 'Poczta Polska',
		gls: 'GLS',
		other: 'Kurier',
	},

	returns: {
		requested: {
			subject: ({ number }) => `Otrzymaliśmy zgłoszenie zwrotu do zamówienia ${number}`,
			heading: 'Zgłoszenie zwrotu przyjęte',
			intro: 'Otrzymaliśmy Twoje zgłoszenie zwrotu. Rozpatrzymy je najszybciej, jak to możliwe.',
		},
		approved: {
			subject: ({ number }) => `Zwrot do zamówienia ${number} został zaakceptowany`,
			heading: 'Zwrot zaakceptowany',
			intro: ({ count }, f) =>
				f.plural(count, {
					one: 'Zaakceptowaliśmy Twój zwrot. Odeślij nam proszę {count} sztukę wymienioną poniżej.',
					few: 'Zaakceptowaliśmy Twój zwrot. Odeślij nam proszę {count} sztuki wymienione poniżej.',
					many: 'Zaakceptowaliśmy Twój zwrot. Odeślij nam proszę {count} sztuk wymienionych poniżej.',
					other:
						'Zaakceptowaliśmy Twój zwrot. Odeślij nam proszę {count} sztuki wymienione poniżej.',
				}),
		},
		rejected: {
			subject: ({ number }) => `Nie możemy przyjąć zwrotu do zamówienia ${number}`,
			heading: 'Zwrot nie został przyjęty',
			intro: 'Niestety nie możemy przyjąć tego zwrotu.',
		},
		refunded: {
			subject: ({ number }) => `Zwrot pieniędzy za zamówienie ${number}`,
			heading: 'Zwracamy pieniądze',
			intro: ({ amount, online }) =>
				online
					? `Otrzymaliśmy zwrócone produkty i zwróciliśmy ${amount} na Twoją pierwotną metodę płatności.`
					: `Otrzymaliśmy zwrócone produkty i zwróciliśmy ${amount}.`,
		},
		itemsTitle: 'Zwracane produkty',
		note: 'Wiadomość od sklepu',
		refundAmount: 'Kwota zwrotu',
	},

	backInStock: {
		subject: ({ product, color, size }) => `Znowu dostępne: ${product} (${color}, ${size})`,
		heading: 'Znowu w sprzedaży',
		intro: ({ product, color, size }) =>
			`Dobra wiadomość: ${product} (kolor: ${color}, rozmiar: ${size}) znowu jest w sprzedaży. Popularne rozmiary szybko się wyprzedają.`,
		button: 'Zamów teraz',
		footnote:
			'Otrzymujesz tę wiadomość, ponieważ ten adres zapisano na powiadomienie o dostępności. To jednorazowe powiadomienie.',
	},
}
