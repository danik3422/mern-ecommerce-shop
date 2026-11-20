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

// Images live in client/public/images/products (see CREDITS.md there)
const products = [
	{
		title: 'Essential White Tee',
		slug: 'essential-white-tee',
		description: 'A heavyweight cotton tee with a relaxed fit. The one you reach for every day.',
		categories: ['women', 'tshirts'],
		color: ['white'],
		price: 25,
	},
	{
		title: 'Graphic Black Tee',
		slug: 'graphic-black-tee',
		description: 'Soft black tee with a small chest print, cut from organic cotton.',
		categories: ['tshirts'],
		color: ['black'],
		price: 29,
	},
	{
		title: 'Original Print Tee',
		slug: 'original-print-tee',
		description: 'Vintage-washed tee with a bold front print and a boxy silhouette.',
		categories: ['women', 'tshirts'],
		color: ['beige'],
		price: 32,
	},
	{
		title: 'Dotted Chambray Shirt',
		slug: 'dotted-chambray-shirt',
		description:
			'Light chambray shirt with a fine dot pattern. Wear it buttoned or open as a layer.',
		categories: ['women', 'jeans'],
		color: ['blue'],
		price: 59,
	},
	{
		title: 'Crochet Poncho',
		slug: 'crochet-poncho',
		description: 'Open-knit cotton poncho with fringed edges, perfect over a tee or a swimsuit.',
		categories: ['women'],
		color: ['beige'],
		price: 69,
		size: ['S', 'M', 'L'],
	},
	{
		title: 'Cotton Sweatshirt',
		slug: 'cotton-sweatshirt',
		description: 'Brushed-back cotton sweatshirt with ribbed cuffs and hem.',
		categories: ['women'],
		color: ['white', 'gray'],
		price: 55,
	},
	{
		title: 'Pink Joggers',
		slug: 'pink-joggers',
		description: 'Relaxed joggers with cargo pockets and elastic cuffs.',
		categories: ['women'],
		color: ['pink'],
		price: 49,
		inStock: false,
	},
	{
		title: 'Terracotta Bomber',
		slug: 'terracotta-bomber',
		description: 'Lightweight bomber jacket in a warm terracotta shade with a ribbed collar.',
		categories: ['coats'],
		color: ['brown'],
		price: 120,
	},
	{
		title: 'Black Leather Jacket',
		slug: 'black-leather-jacket',
		description: 'Classic biker jacket in soft leather with asymmetric zip.',
		categories: ['coats'],
		color: ['black'],
		price: 180,
	},
	{
		title: 'Classic Jeans',
		slug: 'classic-jeans',
		description: 'Straight-leg five-pocket jeans in rigid denim that softens with wear.',
		categories: ['jeans'],
		color: ['blue', 'black'],
		price: 79,
		size: ['28', '30', '32', '34'],
	},
	{
		title: 'Trucker Cap',
		slug: 'trucker-cap',
		description: 'Breathable mesh-back cap with an adjustable snap closure.',
		categories: ['accessories'],
		color: ['white'],
		price: 19,
		size: [],
	},
	{
		title: 'Straw Sun Hat',
		slug: 'straw-sun-hat',
		description: 'Wide-brim woven hat that packs flat for travel.',
		categories: ['accessories'],
		color: ['beige'],
		price: 35,
		size: [],
	},
].map(({ slug, ...product }) => ({
	size: CLOTHING_SIZES,
	inStock: true,
	img: `/images/products/${slug}.jpg`,
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
