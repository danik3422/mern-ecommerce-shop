/**
 * The demo catalog: products, reviews from a few demo shoppers and the owner account.
 * Used by `npm run seed` and by the nightly reset of the public demo (seed/demo.js).
 */
import { randomBytes } from 'node:crypto'
import { Product } from '../models/Product.js'
import { Review } from '../models/Review.js'
import { User } from '../models/User.js'
import { hashPassword } from '../services/password.js'
import { PERMISSION_NAMES } from '../services/permissions.js'

const CLOTHING = ['XS', 'S', 'M', 'L', 'XL']
const JEANS = ['28', '30', '32', '34', '36']
const ONE_SIZE = ['One size']

/** Gives every size some stock; overrides create low-stock and sold-out sizes. */
const withStock = (labels, overrides = {}) =>
	labels.map((label, i) => ({ label, stock: overrides[label] ?? 4 + ((i * 7) % 9) }))

/**
 * Compact product definition: every color becomes a variant with its own stock.
 * `photos` are file names in client/public/images/products (see CREDITS.md there);
 * `photosByColor` gives a color its own photos, otherwise colors share `photos`.
 * `stock` overrides apply to the first color, so each product shows some low/sold-out sizes.
 */
const product = ({
	slug,
	photos = [slug],
	photosByColor = {},
	colors,
	sizes = CLOTHING,
	stock,
	price,
	compareAtPrice,
	...fields
}) => ({
	slug,
	...pln({ price, compareAtPrice }),
	variants: colors.map((color, index) => ({
		color,
		images: (photosByColor[color] ?? photos).map((photo) => `/images/products/${photo}.jpg`),
		sizes: index === 0 ? withStock(sizes, stock) : withStockOffset(sizes, index),
	})),
	...fields,
})

/** Different stock numbers for additional colors, so variants are visibly independent. */
const withStockOffset = (labels, offset) =>
	labels.map((label, i) => ({ label, stock: (i * 5 + offset * 3) % 8 }))

/**
 * Demo prices are written in a rough "base" unit and turned into złoty shop prices:
 * ×4, rounded to the nearest 10 and ending in .99 (25 → 99.99 zł).
 */
const toPln = (base) => Math.round((base * 4) / 10) * 10 - 0.01

const pln = ({ price, compareAtPrice }) => {
	const prices = { price: toPln(price) }
	if (compareAtPrice) {
		prices.compareAtPrice = toPln(compareAtPrice)
		if (prices.compareAtPrice <= prices.price) {
			throw new Error(`Compare-at price must stay above the price (${price} / ${compareAtPrice})`)
		}
	}
	return prices
}

const products = [
	// women
	product({
		title: 'Essential White Tee',
		slug: 'essential-white-tee',
		photos: ['essential-white-tee', 'essential-white-tee-2'],
		brand: 'Northline',
		description: {
			en: 'A heavyweight cotton tee with a relaxed fit. The one you reach for every day.',
			pl: 'Koszulka z grubej bawełny o luźnym kroju. Ta, po którą sięgasz każdego dnia.',
		},
		categories: ['women', 'men', 'tshirts'],
		colors: ['white'],
		stock: { XL: 0 },
		price: 25,
	}),
	product({
		title: 'Original Print Tee',
		slug: 'original-print-tee',
		brand: 'Kiiki',
		description: {
			en: 'Vintage-washed tee with a bold front print and a boxy silhouette.',
			pl: 'Sprana w stylu vintage koszulka z wyrazistym nadrukiem z przodu i pudełkowym krojem.',
		},
		categories: ['women', 'tshirts'],
		colors: ['beige'],
		stock: { S: 2 },
		price: 32,
	}),
	product({
		title: 'Trail Print Tee',
		slug: 'trail-print-tee',
		brand: 'Kiiki',
		description: {
			en: 'Soft white tee with a hand-drawn outdoor print on the front.',
			pl: 'Miękka biała koszulka z ręcznie rysowanym, outdoorowym nadrukiem na przodzie.',
		},
		categories: ['women', 'tshirts'],
		colors: ['white'],
		price: 24,
		compareAtPrice: 30,
	}),
	product({
		title: 'Dotted Chambray Shirt',
		slug: 'dotted-chambray-shirt',
		brand: 'Northline',
		description: {
			en: 'Light chambray shirt with a fine dot pattern. Wear it buttoned or open as a layer.',
			pl: 'Lekka koszula z chambray w drobne kropki. Noś ją zapiętą albo rozpiętą, jako dodatkową warstwę.',
		},
		categories: ['women', 'jeans'],
		colors: ['blue'],
		price: 47,
		compareAtPrice: 59,
	}),
	product({
		title: 'Crochet Poncho',
		slug: 'crochet-poncho',
		brand: 'Maris',
		description: {
			en: 'Open-knit cotton poncho with fringed edges, perfect over a tee or a swimsuit.',
			pl: 'Ażurowe ponczo z bawełny wykończone frędzlami – idealne na koszulkę albo strój kąpielowy.',
		},
		categories: ['women'],
		colors: ['beige'],
		sizes: ['S', 'M', 'L'],
		stock: { L: 1 },
		price: 69,
	}),
	product({
		title: 'Cotton Sweatshirt',
		slug: 'cotton-sweatshirt',
		brand: 'Northline',
		description: {
			en: 'Brushed-back cotton sweatshirt with ribbed cuffs and hem.',
			pl: 'Bawełniana bluza z miękko drapanym wnętrzem i ściągaczami przy mankietach i na dole.',
		},
		categories: ['women'],
		colors: ['white', 'gray'],
		price: 55,
	}),
	product({
		title: 'Orange Sweatshirt',
		slug: 'orange-sweatshirt',
		brand: 'Northline',
		description: {
			en: 'Bright crew-neck sweatshirt in loopback cotton with a relaxed fit.',
			pl: 'Jaskrawa bluza z okrągłym dekoltem z bawełny pętelkowej, o swobodnym kroju.',
		},
		categories: ['women'],
		colors: ['orange'],
		stock: { M: 3 },
		price: 39,
		compareAtPrice: 55,
	}),
	product({
		title: 'Pink Joggers',
		slug: 'pink-joggers',
		brand: 'Maris',
		description: {
			en: 'Relaxed joggers with cargo pockets and elastic cuffs.',
			pl: 'Luźne joggery z kieszeniami cargo i ściągaczami na dole nogawek.',
		},
		categories: ['women'],
		colors: ['pink'],
		stock: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
		price: 49,
	}),
	product({
		title: 'Sunshine Tracksuit',
		slug: 'sunshine-tracksuit',
		brand: 'Velo',
		description: {
			en: 'Cropped hoodie and matching joggers in soft fleece. Sold as a set.',
			pl: 'Krótka bluza z kapturem i pasujące do niej joggery z miękkiego polaru. Sprzedawane w komplecie.',
		},
		categories: ['women'],
		colors: ['yellow'],
		price: 89,
	}),
	// dresses
	product({
		title: 'Floral Wrap Dress',
		slug: 'floral-wrap-dress',
		brand: 'Maris',
		description: {
			en: 'Flowing wrap dress in a botanical print with a tie waist and short sleeves.',
			pl: 'Zwiewna kopertowa sukienka w roślinny wzór, z krótkimi rękawami i wiązaniem w talii.',
		},
		categories: ['women', 'dresses'],
		colors: ['white'],
		sizes: ['XS', 'S', 'M', 'L'],
		price: 79,
	}),
	product({
		title: 'Red Maxi Dress',
		slug: 'red-maxi-dress',
		photos: ['red-maxi-dress', 'red-maxi-dress-2'],
		brand: 'Aster & Co',
		description: {
			en: 'Floor-length dress with a full skirt that moves beautifully. Lined.',
			pl: 'Sukienka do ziemi z szeroką spódnicą, która pięknie układa się w ruchu. Na podszewce.',
		},
		categories: ['women', 'dresses'],
		colors: ['red'],
		sizes: ['XS', 'S', 'M', 'L'],
		stock: { XS: 1 },
		price: 99,
		compareAtPrice: 139,
	}),
	product({
		title: 'Denim Shirt Dress',
		slug: 'denim-shirt-dress',
		brand: 'Indigo Works',
		description: {
			en: 'Button-through dress in light denim with chest pockets and a flared skirt.',
			pl: 'Zapinana na guziki sukienka z jasnego denimu, z kieszeniami na piersi i rozkloszowanym dołem.',
		},
		categories: ['women', 'dresses', 'jeans'],
		colors: ['blue'],
		price: 69,
	}),
	// coats & jackets
	product({
		title: 'Sky Blue Wool Coat',
		slug: 'sky-blue-wool-coat',
		brand: 'Aster & Co',
		description: {
			en: 'Long single-breasted coat in a wool blend. A colourful take on a classic.',
			pl: 'Długi, jednorzędowy płaszcz z mieszanki wełny. Klasyka w zaskakująco kolorowym wydaniu.',
		},
		categories: ['women', 'coats'],
		colors: ['blue'],
		stock: { S: 2 },
		price: 189,
		compareAtPrice: 249,
	}),
	product({
		title: 'Terracotta Bomber',
		slug: 'terracotta-bomber',
		brand: 'Aster & Co',
		description: {
			en: 'Lightweight bomber jacket in a warm terracotta shade with a ribbed collar.',
			pl: 'Lekka kurtka bomberka w ciepłym odcieniu terakoty, z prążkowanym kołnierzem.',
		},
		categories: ['women', 'men', 'coats'],
		colors: ['brown'],
		price: 96,
		compareAtPrice: 120,
	}),
	product({
		title: 'Black Leather Jacket',
		slug: 'black-leather-jacket',
		photos: ['black-leather-jacket', 'black-leather-jacket-2'],
		brand: 'Aster & Co',
		description: {
			en: 'Classic biker jacket in soft leather with asymmetric zip.',
			pl: 'Klasyczna ramoneska z miękkiej skóry, zapinana na asymetryczny zamek.',
		},
		categories: ['men', 'women', 'coats'],
		colors: ['black'],
		stock: { M: 2 },
		price: 180,
	}),
	product({
		title: 'Navy Blazer',
		slug: 'navy-blazer',
		brand: 'Hollis',
		description: {
			en: 'Tailored two-button blazer in stretch wool. Sharp with chinos or a suit trouser.',
			pl: 'Dopasowana marynarka na dwa guziki z elastycznej wełny. Świetnie wygląda z chinosami albo spodniami od garnituru.',
		},
		categories: ['men', 'coats'],
		colors: ['blue'],
		sizes: ['S', 'M', 'L', 'XL'],
		price: 159,
	}),
	// men
	product({
		title: 'Graphic Black Tee',
		slug: 'graphic-black-tee',
		photos: ['graphic-black-tee', 'graphic-black-tee-2'],
		brand: 'Studio 705',
		description: {
			en: 'Soft black tee with a small chest print, cut from organic cotton.',
			pl: 'Miękka czarna koszulka z małym nadrukiem na piersi, uszyta z bawełny organicznej.',
		},
		categories: ['men', 'tshirts'],
		colors: ['black'],
		price: 22,
		compareAtPrice: 29,
	}),
	product({
		title: 'Peace Graphic Tee',
		slug: 'peace-graphic-tee',
		brand: 'Studio 705',
		description: {
			en: 'Longline black tee with a bold hand print on the chest.',
			pl: 'Wydłużona czarna koszulka z wyrazistym nadrukiem dłoni na piersi.',
		},
		categories: ['men', 'tshirts'],
		colors: ['black'],
		price: 28,
	}),
	product({
		title: 'Sage Garment-Dyed Tee',
		slug: 'sage-garment-dyed-tee',
		brand: 'Northline',
		description: {
			en: 'Garment-dyed cotton tee with a lived-in feel from the first wear.',
			pl: 'Bawełniana koszulka barwiona po uszyciu – miękka i przyjemnie „znoszona” już od pierwszego założenia.',
		},
		categories: ['men', 'women', 'tshirts'],
		colors: ['green'],
		price: 27,
	}),
	product({
		title: 'Basic Tee Three-Pack',
		slug: 'basic-tee-three-pack',
		brand: 'Northline',
		description: {
			en: 'Three crew-neck tees in mixed colours. Everyday basics at a better price.',
			pl: 'Trzy koszulki z okrągłym dekoltem w różnych kolorach. Codzienna podstawa garderoby w lepszej cenie.',
		},
		categories: ['men', 'tshirts'],
		colors: ['white', 'black', 'red', 'blue', 'yellow'],
		price: 45,
		compareAtPrice: 60,
	}),
	product({
		title: 'Heather Hoodie',
		slug: 'heather-hoodie',
		brand: 'Velo',
		description: {
			en: 'Midweight fleece hoodie in heather grey with a kangaroo pocket.',
			pl: 'Bluza z kapturem z polaru średniej grubości, w szarym melanżu, z kieszenią kangurką.',
		},
		categories: ['men', 'women'],
		colors: ['gray'],
		stock: { XS: 0 },
		price: 59,
	}),
	// jeans & trousers
	product({
		title: 'Classic Jeans',
		slug: 'classic-jeans',
		photos: ['classic-jeans', 'classic-jeans-2'],
		brand: 'Indigo Works',
		description: {
			en: 'Straight-leg five-pocket jeans in rigid denim that softens with wear.',
			pl: 'Jeansy z prostą nogawką i pięcioma kieszeniami. Sztywny denim z każdym noszeniem staje się coraz bardziej miękki.',
		},
		categories: ['men', 'jeans'],
		colors: ['blue', 'black'],
		sizes: JEANS,
		price: 79,
	}),
	product({
		title: 'Light Skinny Jeans',
		slug: 'light-skinny-jeans',
		photos: ['light-skinny-jeans', 'light-skinny-jeans-2'],
		brand: 'Indigo Works',
		description: {
			en: 'High-rise skinny jeans in a light wash with plenty of stretch.',
			pl: 'Jeansy skinny z wysokim stanem, w jasnym praniu, z dużą domieszką elastanu.',
		},
		categories: ['women', 'jeans'],
		colors: ['blue'],
		sizes: ['24', '26', '28', '30', '32'],
		stock: { 24: 1 },
		price: 59,
		compareAtPrice: 75,
	}),
	product({
		title: 'Black Wide-Leg Jeans',
		slug: 'black-wide-leg-jeans',
		brand: 'Indigo Works',
		description: {
			en: 'Relaxed wide-leg jeans in washed black denim.',
			pl: 'Luźne jeansy z szeroką nogawką z czarnego, spranego denimu.',
		},
		categories: ['women', 'men', 'jeans'],
		colors: ['black'],
		sizes: JEANS,
		price: 85,
	}),
	product({
		title: 'Ripped Slim Jeans',
		slug: 'ripped-slim-jeans',
		brand: 'Indigo Works',
		description: {
			en: 'Slim jeans with worn-in rips and patches for a vintage look.',
			pl: 'Wąskie jeansy z przetarciami i łatami, w stylu vintage.',
		},
		categories: ['women', 'jeans'],
		colors: ['blue'],
		sizes: ['24', '26', '28', '30'],
		stock: { 30: 0 },
		price: 72,
	}),
	product({
		title: 'Light Tapered Jeans',
		slug: 'light-tapered-jeans',
		brand: 'Indigo Works',
		description: {
			en: 'Tapered jeans in a bleached wash with distressed knees.',
			pl: 'Zwężane ku dołowi jeansy w rozjaśnianym praniu, z przetarciami na kolanach.',
		},
		categories: ['men', 'jeans'],
		colors: ['blue'],
		sizes: JEANS,
		price: 69,
	}),
	product({
		title: 'Stone Chinos',
		slug: 'stone-chinos',
		brand: 'Hollis',
		description: {
			en: 'Slim chinos in cotton twill with a touch of stretch and cuffed hems.',
			pl: 'Wąskie chinosy z bawełnianego diagonalu z dodatkiem elastanu, z podwiniętymi nogawkami.',
		},
		categories: ['men', 'jeans'],
		colors: ['beige'],
		sizes: JEANS,
		price: 55,
	}),
	// accessories
	product({
		title: 'Trucker Cap',
		slug: 'trucker-cap',
		brand: 'Studio 705',
		description: {
			en: 'Breathable mesh-back cap with an adjustable snap closure.',
			pl: 'Przewiewna czapka z daszkiem, z siateczką z tyłu i regulowanym zapięciem na zatrzaski.',
		},
		categories: ['accessories'],
		colors: ['white'],
		sizes: ONE_SIZE,
		price: 19,
	}),
	product({
		title: 'Washed Cotton Cap',
		slug: 'washed-cotton-cap',
		brand: 'Studio 705',
		description: {
			en: 'Six-panel cap in garment-washed cotton with a curved brim.',
			pl: 'Sześciopanelowa czapka z pranej bawełny, z wyprofilowanym daszkiem.',
		},
		categories: ['accessories'],
		colors: ['gray'],
		sizes: ONE_SIZE,
		price: 22,
	}),
	product({
		title: 'Straw Sun Hat',
		slug: 'straw-sun-hat',
		brand: 'Maris',
		description: {
			en: 'Wide-brim woven hat that packs flat for travel.',
			pl: 'Pleciony kapelusz z szerokim rondem, który w podróży złożysz na płasko.',
		},
		categories: ['accessories'],
		colors: ['beige'],
		sizes: ONE_SIZE,
		price: 35,
	}),
	product({
		title: 'Rib Knit Beanie',
		slug: 'rib-knit-beanie',
		brand: 'Velo',
		description: {
			en: 'Chunky rib-knit beanie in a wool blend with a turn-up cuff.',
			pl: 'Gruba czapka w prążek z mieszanki wełny, z wywijanym brzegiem.',
		},
		categories: ['accessories'],
		colors: ['orange'],
		sizes: ONE_SIZE,
		stock: { 'One size': 2 },
		price: 18,
		compareAtPrice: 25,
	}),
	product({
		title: 'Navy Daypack',
		slug: 'navy-daypack',
		brand: 'Velo',
		description: {
			en: 'Water-repellent 20 L backpack with a padded laptop sleeve.',
			pl: 'Plecak 20 l z materiału odpychającego wodę, z wyściełaną kieszenią na laptopa.',
		},
		categories: ['accessories'],
		colors: ['blue'],
		sizes: ONE_SIZE,
		price: 65,
	}),
	product({
		title: 'Red Top-Handle Bag',
		slug: 'red-top-handle-bag',
		brand: 'Aster & Co',
		description: {
			en: 'Structured leather bag with a top handle, metal clasp and detachable strap.',
			pl: 'Usztywniona skórzana torebka z górnym uchwytem, metalowym zapięciem i odpinanym paskiem.',
		},
		categories: ['accessories'],
		colors: ['red'],
		sizes: ONE_SIZE,
		price: 149,
	}),
	product({
		title: 'Woven Basket Bag',
		slug: 'woven-basket-bag',
		brand: 'Maris',
		description: {
			en: 'Rattan basket bag with leather handles — made for summer.',
			pl: 'Koszykowa torba z rattanu ze skórzanymi uchwytami – stworzona na lato.',
		},
		categories: ['accessories'],
		colors: ['orange'],
		sizes: ONE_SIZE,
		stock: { 'One size': 0 },
		price: 89,
	}),
	product({
		title: 'Croc Crossbody Bag',
		slug: 'croc-crossbody-bag',
		brand: 'Aster & Co',
		description: {
			en: 'Compact crossbody bag in croc-embossed leather with an adjustable strap.',
			pl: 'Niewielka listonoszka ze skóry tłoczonej w krokodyli wzór, z regulowanym paskiem.',
		},
		categories: ['accessories'],
		colors: ['brown'],
		sizes: ONE_SIZE,
		price: 95,
		compareAtPrice: 129,
	}),
	product({
		title: 'Round Sunglasses',
		slug: 'round-sunglasses',
		brand: 'Hollis',
		description: {
			en: 'Thin metal frames with green-tinted lenses and full UV400 protection.',
			pl: 'Cienkie metalowe oprawki, szkła w zielonym odcieniu i pełna ochrona UV400.',
		},
		categories: ['accessories'],
		colors: ['green'],
		sizes: ONE_SIZE,
		price: 49,
	}),
]

/** Demo reviews so ratings and the "top rated" sort have data. */
export const DEMO_REVIEWERS = ['emma', 'lukas', 'sofia', 'noah']
const DEMO_REVIEWS = {
	'essential-white-tee': [5, 5, 4, 5],
	'classic-jeans': [5, 4, 4, 4],
	'black-leather-jacket': [5, 5],
	'red-maxi-dress': [4, 5, 5],
	'sky-blue-wool-coat': [5, 4],
	'heather-hoodie': [4, 4, 3],
	'graphic-black-tee': [4, 3],
	'navy-daypack': [5],
	'floral-wrap-dress': [4, 5],
	'light-skinny-jeans': [3, 4, 4],
}
/**
 * How the items fit, per review in the order above: `[fit, size bought]`.
 * Classic Jeans run small (the product page then suggests one size up), the white tee is true
 * to size and the hoodie gets mixed answers.
 */
const DEMO_FIT = {
	'classic-jeans': [
		['small', '30'],
		['small', '32'],
		['small', '30'],
		['true', '32'],
	],
	'essential-white-tee': [
		['true', 'M'],
		['true', 'L'],
		['true', 'S'],
		['large', 'M'],
	],
	'heather-hoodie': [
		['large', 'M'],
		['true', 'L'],
		['small', 'S'],
	],
}

const REVIEW_TEXT = {
	5: ['Love it', 'Great quality and fits true to size.'],
	4: ['Very nice', 'Good fit, the fabric feels nice. Would buy again.'],
	3: ['Okay', 'Fine for the price, but runs a little small.'],
}

/** Shoppers who wrote the demo reviews (and place the demo orders in seed/demo.js). */
export const seedReviewers = async () => {
	// nobody signs in as them: a random password keeps the accounts closed on a public demo
	const passwordHash = await hashPassword(randomBytes(24).toString('hex'))
	return Promise.all(
		DEMO_REVIEWERS.map((username) =>
			User.findOneAndUpdate(
				{ username },
				{ $setOnInsert: { email: `${username}@example.com`, passwordHash } },
				{ upsert: true, returnDocument: 'after' },
			),
		),
	)
}

/** Replaces all reviews with the demo ones and updates the product ratings. */
export const seedReviews = async (insertedProducts) => {
	const reviewers = await seedReviewers()
	await Review.deleteMany({})
	const bySlug = new Map(insertedProducts.map((p) => [p.slug, p]))
	for (const [slug, ratings] of Object.entries(DEMO_REVIEWS)) {
		const target = bySlug.get(slug)
		const reviews = ratings.map((rating, i) => ({
			product: target._id,
			user: reviewers[i]._id,
			username: reviewers[i].username,
			rating,
			title: REVIEW_TEXT[rating][0],
			body: REVIEW_TEXT[rating][1],
			...(DEMO_FIT[slug]?.[i] && { fit: DEMO_FIT[slug][i][0], sizeBought: DEMO_FIT[slug][i][1] }),
		}))
		await Review.insertMany(reviews)
		const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
		await Product.updateOne(
			{ _id: target._id },
			{ rating: { average: Math.round(average * 10) / 10, count: ratings.length } },
		)
	}
	return Object.keys(DEMO_REVIEWS).length
}

/** Creates the owner account "admin" or resets its password and full access. */
export const seedOwner = async (password) => {
	await User.findOneAndUpdate(
		{ username: 'admin' },
		{
			email: 'admin@example.com',
			passwordHash: await hashPassword(password),
			role: 'staff',
			isOwner: true,
			permissions: PERMISSION_NAMES,
			blocked: false,
		},
		{ upsert: true },
	)
}

/**
 * Replaces all products with the demo catalog.
 * @returns the inserted products, newest first
 */
export const seedCatalog = async () => {
	await Product.deleteMany({})
	// inserted one by one so "newest" follows the order above (first = newest)
	const inserted = []
	for (const [i, data] of products.entries()) {
		const createdAt = new Date(Date.now() - i * 60_000)
		inserted.push(await Product.create({ ...data, createdAt, updatedAt: createdAt }))
	}
	return inserted
}
