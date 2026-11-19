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

const sizes = ['XS', 'S', 'M', 'L', 'XL']

const products = [
	{
		title: 'Guitar Vintage Tee',
		img: 'https://d3o2e4jr3mxnm3.cloudfront.net/Mens-Jake-Guitar-Vintage-Crusher-Tee_68382_1_lg.png',
		categories: ['women', 'tshirts'],
		color: ['white', 'black'],
		price: 25,
	},
	{
		title: 'Natural Tee',
		img: 'https://cdn.shopify.com/s/files/1/0101/4832/products/Angela_Natural_Tee.png?v=1606780388',
		categories: ['women', 'tshirts'],
		color: ['beige', 'white'],
		price: 22,
	},
	{
		title: 'Classic Shirt',
		img: 'https://www.prada.com/content/dam/pradanux_products/U/UCS/UCS319/1YOTF010O/UCS319_1YOT_F010O_S_182_SLF.png',
		categories: ['women', 'shirts'],
		color: ['white'],
		price: 89,
	},
	{
		title: 'Summer Top',
		img: 'https://www.burdastyle.com/pub/media/catalog/product/cache/7bd3727382ce0a860b68816435d76e26/107/BUS-PAT-BURTE-1320516/1170x1470_BS_2016_05_132_front.png',
		categories: ['women'],
		color: ['red', 'white'],
		price: 35,
	},
	{
		title: 'Tote Bag',
		img: 'https://images.ctfassets.net/5gvckmvm9289/3BlDoZxSSjqAvv1jBJP7TH/65f9a95484117730ace42abf64e89572/Noissue-x-Creatsy-Tote-Bag-Mockup-Bundle-_4_-2.png',
		categories: ['accessories'],
		color: ['beige'],
		price: 15,
		size: [],
	},
	{
		title: 'Chill Cap',
		img: 'https://d3o2e4jr3mxnm3.cloudfront.net/Rocket-Vintage-Chill-Cap_66374_1_lg.png',
		categories: ['accessories'],
		color: ['black', 'blue'],
		price: 18,
		size: [],
	},
	{
		title: 'Arrow Jacket',
		img: 'https://www.vintageindustries.nl/download_front/qympzk1762/2217_Arrow_Jacket_Forest.png',
		categories: ['coats', 'jeans'],
		color: ['green'],
		price: 120,
	},
	{
		title: 'Light Jacket',
		img: 'https://www.pngarts.com/files/3/Women-Jacket-PNG-High-Quality-Image.png',
		categories: ['coats', 'jeans', 'women'],
		color: ['black'],
		price: 95,
	},
	{
		title: 'Denim Jeans',
		img: 'https://i.ibb.co/S6qMxwr/jean.jpg',
		categories: ['jeans'],
		color: ['blue', 'black', 'gray'],
		price: 60,
	},
].map((p) => ({
	size: sizes,
	inStock: true,
	description: `${p.title} — comfortable everyday piece from our collection.`,
	...p,
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
