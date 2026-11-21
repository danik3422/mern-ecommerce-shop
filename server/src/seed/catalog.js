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
		description: 'A heavyweight cotton tee with a relaxed fit. The one you reach for every day.',
		categories: ['women', 'men', 'tshirts'],
		colors: ['white'],
		stock: { XL: 0 },
		price: 25,
	}),
	product({
		title: 'Original Print Tee',
		slug: 'original-print-tee',
		brand: 'Kiiki',
		description: 'Vintage-washed tee with a bold front print and a boxy silhouette.',
		categories: ['women', 'tshirts'],
		colors: ['beige'],
		stock: { S: 2 },
		price: 32,
	}),
	product({
		title: 'Trail Print Tee',
		slug: 'trail-print-tee',
		brand: 'Kiiki',
		description: 'Soft white tee with a hand-drawn outdoor print on the front.',
		categories: ['women', 'tshirts'],
		colors: ['white'],
		price: 24,
		compareAtPrice: 30,
	}),
	product({
		title: 'Dotted Chambray Shirt',
		slug: 'dotted-chambray-shirt',
		brand: 'Northline',
		description:
			'Light chambray shirt with a fine dot pattern. Wear it buttoned or open as a layer.',
		categories: ['women', 'jeans'],
		colors: ['blue'],
		price: 47,
		compareAtPrice: 59,
	}),
	product({
		title: 'Crochet Poncho',
		slug: 'crochet-poncho',
		brand: 'Maris',
		description: 'Open-knit cotton poncho with fringed edges, perfect over a tee or a swimsuit.',
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
		description: 'Brushed-back cotton sweatshirt with ribbed cuffs and hem.',
		categories: ['women'],
		colors: ['white', 'gray'],
		price: 55,
	}),
	product({
		title: 'Orange Sweatshirt',
		slug: 'orange-sweatshirt',
		brand: 'Northline',
		description: 'Bright crew-neck sweatshirt in loopback cotton with a relaxed fit.',
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
		description: 'Relaxed joggers with cargo pockets and elastic cuffs.',
		categories: ['women'],
		colors: ['pink'],
		stock: { XS: 0, S: 0, M: 0, L: 0, XL: 0 },
		price: 49,
	}),
	product({
		title: 'Sunshine Tracksuit',
		slug: 'sunshine-tracksuit',
		brand: 'Velo',
		description: 'Cropped hoodie and matching joggers in soft fleece. Sold as a set.',
		categories: ['women'],
		colors: ['yellow'],
		price: 89,
	}),
	// dresses
	product({
		title: 'Floral Wrap Dress',
		slug: 'floral-wrap-dress',
		brand: 'Maris',
		description: 'Flowing wrap dress in a botanical print with a tie waist and short sleeves.',
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
		description: 'Floor-length dress with a full skirt that moves beautifully. Lined.',
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
		description: 'Button-through dress in light denim with chest pockets and a flared skirt.',
		categories: ['women', 'dresses', 'jeans'],
		colors: ['blue'],
		price: 69,
	}),
	// coats & jackets
	product({
		title: 'Sky Blue Wool Coat',
		slug: 'sky-blue-wool-coat',
		brand: 'Aster & Co',
		description: 'Long single-breasted coat in a wool blend. A colourful take on a classic.',
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
		description: 'Lightweight bomber jacket in a warm terracotta shade with a ribbed collar.',
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
		description: 'Classic biker jacket in soft leather with asymmetric zip.',
		categories: ['men', 'women', 'coats'],
		colors: ['black'],
		stock: { M: 2 },
		price: 180,
	}),
	product({
		title: 'Navy Blazer',
		slug: 'navy-blazer',
		brand: 'Hollis',
		description: 'Tailored two-button blazer in stretch wool. Sharp with chinos or a suit trouser.',
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
		description: 'Soft black tee with a small chest print, cut from organic cotton.',
		categories: ['men', 'tshirts'],
		colors: ['black'],
		price: 22,
		compareAtPrice: 29,
	}),
	product({
		title: 'Peace Graphic Tee',
		slug: 'peace-graphic-tee',
		brand: 'Studio 705',
		description: 'Longline black tee with a bold hand print on the chest.',
		categories: ['men', 'tshirts'],
		colors: ['black'],
		price: 28,
	}),
	product({
		title: 'Sage Garment-Dyed Tee',
		slug: 'sage-garment-dyed-tee',
		brand: 'Northline',
		description: 'Garment-dyed cotton tee with a lived-in feel from the first wear.',
		categories: ['men', 'women', 'tshirts'],
		colors: ['green'],
		price: 27,
	}),
	product({
		title: 'Basic Tee Three-Pack',
		slug: 'basic-tee-three-pack',
		brand: 'Northline',
		description: 'Three crew-neck tees in mixed colours. Everyday basics at a better price.',
		categories: ['men', 'tshirts'],
		colors: ['white', 'black', 'red', 'blue', 'yellow'],
		price: 45,
		compareAtPrice: 60,
	}),
	product({
		title: 'Heather Hoodie',
		slug: 'heather-hoodie',
		brand: 'Velo',
		description: 'Midweight fleece hoodie in heather grey with a kangaroo pocket.',
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
		description: 'Straight-leg five-pocket jeans in rigid denim that softens with wear.',
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
		description: 'High-rise skinny jeans in a light wash with plenty of stretch.',
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
		description: 'Relaxed wide-leg jeans in washed black denim.',
		categories: ['women', 'men', 'jeans'],
		colors: ['black'],
		sizes: JEANS,
		price: 85,
	}),
	product({
		title: 'Ripped Slim Jeans',
		slug: 'ripped-slim-jeans',
		brand: 'Indigo Works',
		description: 'Slim jeans with worn-in rips and patches for a vintage look.',
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
		description: 'Tapered jeans in a bleached wash with distressed knees.',
		categories: ['men', 'jeans'],
		colors: ['blue'],
		sizes: JEANS,
		price: 69,
	}),
	product({
		title: 'Stone Chinos',
		slug: 'stone-chinos',
		brand: 'Hollis',
		description: 'Slim chinos in cotton twill with a touch of stretch and cuffed hems.',
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
		description: 'Breathable mesh-back cap with an adjustable snap closure.',
		categories: ['accessories'],
		colors: ['white'],
		sizes: ONE_SIZE,
		price: 19,
	}),
	product({
		title: 'Washed Cotton Cap',
		slug: 'washed-cotton-cap',
		brand: 'Studio 705',
		description: 'Six-panel cap in garment-washed cotton with a curved brim.',
		categories: ['accessories'],
		colors: ['gray'],
		sizes: ONE_SIZE,
		price: 22,
	}),
	product({
		title: 'Straw Sun Hat',
		slug: 'straw-sun-hat',
		brand: 'Maris',
		description: 'Wide-brim woven hat that packs flat for travel.',
		categories: ['accessories'],
		colors: ['beige'],
		sizes: ONE_SIZE,
		price: 35,
	}),
	product({
		title: 'Rib Knit Beanie',
		slug: 'rib-knit-beanie',
		brand: 'Velo',
		description: 'Chunky rib-knit beanie in a wool blend with a turn-up cuff.',
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
		description: 'Water-repellent 20 L backpack with a padded laptop sleeve.',
		categories: ['accessories'],
		colors: ['blue'],
		sizes: ONE_SIZE,
		price: 65,
	}),
	product({
		title: 'Red Top-Handle Bag',
		slug: 'red-top-handle-bag',
		brand: 'Aster & Co',
		description: 'Structured leather bag with a top handle, metal clasp and detachable strap.',
		categories: ['accessories'],
		colors: ['red'],
		sizes: ONE_SIZE,
		price: 149,
	}),
	product({
		title: 'Woven Basket Bag',
		slug: 'woven-basket-bag',
		brand: 'Maris',
		description: 'Rattan basket bag with leather handles — made for summer.',
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
		description: 'Compact crossbody bag in croc-embossed leather with an adjustable strap.',
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
		description: 'Thin metal frames with green-tinted lenses and full UV400 protection.',
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
	'classic-jeans': [5, 4, 4],
	'black-leather-jacket': [5, 5],
	'red-maxi-dress': [4, 5, 5],
	'sky-blue-wool-coat': [5, 4],
	'heather-hoodie': [4, 4, 3],
	'graphic-black-tee': [4, 3],
	'navy-daypack': [5],
	'floral-wrap-dress': [4, 5],
	'light-skinny-jeans': [3, 4, 4],
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
