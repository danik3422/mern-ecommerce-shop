/**
 * Replaces all products with demo data: `npm run seed`
 * Set SEED_ADMIN_PASSWORD to also create/update an admin user "admin".
 * Refuses to run with NODE_ENV=production unless `--force` is passed.
 */
import { connectDb, disconnectDb } from '../src/config/db.js'
import { env } from '../src/config/env.js'
import { Product } from '../src/models/Product.js'
import { User } from '../src/models/User.js'
import { hashPassword } from '../src/services/password.js'

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL']
const JEANS_SIZES = ['28', '30', '32', '34']
const ONE_SIZE = ['One size']

/** Gives every size some stock; a few sizes are low or sold out to show those states. */
const withStock = (labels, overrides = {}) =>
	labels.map((label, i) => ({ label, stock: overrides[label] ?? 4 + ((i * 7) % 9) }))

// Images live in client/public/images/products (see CREDITS.md there)
const products = [
	{
		title: 'Essential White Tee',
		slug: 'essential-white-tee',
		brand: 'Northline',
		description: 'A heavyweight cotton tee with a relaxed fit. The one you reach for every day.',
		categories: ['women', 'tshirts'],
		colors: ['white'],
		sizes: withStock(CLOTHING_SIZES, { XL: 0 }),
		price: 25,
	},
	{
		title: 'Graphic Black Tee',
		slug: 'graphic-black-tee',
		brand: 'Studio 705',
		description: 'Soft black tee with a small chest print, cut from organic cotton.',
		categories: ['tshirts'],
		colors: ['black'],
		sizes: withStock(CLOTHING_SIZES),
		price: 22,
		compareAtPrice: 29,
	},
	{
		title: 'Original Print Tee',
		slug: 'original-print-tee',
		brand: 'Kiiki',
		description: 'Vintage-washed tee with a bold front print and a boxy silhouette.',
		categories: ['women', 'tshirts'],
		colors: ['beige'],
		sizes: withStock(CLOTHING_SIZES, { S: 2 }),
		price: 32,
	},
	{
		title: 'Dotted Chambray Shirt',
		slug: 'dotted-chambray-shirt',
		brand: 'Northline',
		description:
			'Light chambray shirt with a fine dot pattern. Wear it buttoned or open as a layer.',
		categories: ['women', 'jeans'],
		colors: ['blue'],
		sizes: withStock(CLOTHING_SIZES),
		price: 47,
		compareAtPrice: 59,
	},
	{
		title: 'Crochet Poncho',
		slug: 'crochet-poncho',
		brand: 'Maris',
		description: 'Open-knit cotton poncho with fringed edges, perfect over a tee or a swimsuit.',
		categories: ['women'],
		colors: ['beige'],
		sizes: withStock(['S', 'M', 'L'], { L: 1 }),
		price: 69,
	},
	{
		title: 'Cotton Sweatshirt',
		slug: 'cotton-sweatshirt',
		brand: 'Northline',
		description: 'Brushed-back cotton sweatshirt with ribbed cuffs and hem.',
		categories: ['women'],
		colors: ['white', 'gray'],
		sizes: withStock(CLOTHING_SIZES),
		price: 55,
	},
	{
		title: 'Pink Joggers',
		slug: 'pink-joggers',
		brand: 'Maris',
		description: 'Relaxed joggers with cargo pockets and elastic cuffs.',
		categories: ['women'],
		colors: ['pink'],
		sizes: withStock(CLOTHING_SIZES, { XS: 0, S: 0, M: 0, L: 0, XL: 0 }),
		price: 49,
	},
	{
		title: 'Terracotta Bomber',
		slug: 'terracotta-bomber',
		brand: 'Aster & Co',
		description: 'Lightweight bomber jacket in a warm terracotta shade with a ribbed collar.',
		categories: ['coats'],
		colors: ['brown'],
		sizes: withStock(CLOTHING_SIZES),
		price: 96,
		compareAtPrice: 120,
	},
	{
		title: 'Black Leather Jacket',
		slug: 'black-leather-jacket',
		brand: 'Aster & Co',
		description: 'Classic biker jacket in soft leather with asymmetric zip.',
		categories: ['coats'],
		colors: ['black'],
		sizes: withStock(CLOTHING_SIZES, { M: 2 }),
		price: 180,
	},
	{
		title: 'Classic Jeans',
		slug: 'classic-jeans',
		brand: 'Indigo Works',
		description: 'Straight-leg five-pocket jeans in rigid denim that softens with wear.',
		categories: ['jeans'],
		colors: ['blue', 'black'],
		sizes: withStock(JEANS_SIZES),
		price: 79,
	},
	{
		title: 'Trucker Cap',
		slug: 'trucker-cap',
		brand: 'Studio 705',
		description: 'Breathable mesh-back cap with an adjustable snap closure.',
		categories: ['accessories'],
		colors: ['white'],
		sizes: withStock(ONE_SIZE),
		price: 19,
	},
	{
		title: 'Straw Sun Hat',
		slug: 'straw-sun-hat',
		brand: 'Maris',
		description: 'Wide-brim woven hat that packs flat for travel.',
		categories: ['accessories'],
		colors: ['beige'],
		sizes: withStock(ONE_SIZE),
		price: 35,
	},
].map(({ slug, ...product }) => ({
	slug,
	images: [`/images/products/${slug}.jpg`],
	...product,
}))

const seedAdmin = async (password) => {
	await User.findOneAndUpdate(
		{ username: 'admin' },
		{ email: 'admin@example.com', passwordHash: await hashPassword(password), isAdmin: true },
		{ upsert: true },
	)
	console.log('Admin user "admin" is ready')
}

const main = async () => {
	if (env.isProduction && !process.argv.includes('--force')) {
		throw new Error('Refusing to wipe products in production. Pass --force if you are sure.')
	}

	await connectDb(env.MONGO_URL)
	await Product.deleteMany({})
	await Product.insertMany(products)
	console.log(`Seeded ${products.length} products`)

	if (process.env.SEED_ADMIN_PASSWORD) await seedAdmin(process.env.SEED_ADMIN_PASSWORD)
}

main()
	.catch((err) => {
		console.error(err.message)
		process.exitCode = 1
	})
	.finally(disconnectDb)
