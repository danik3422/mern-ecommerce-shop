/**
 * Fills the database with the demo shop: `npm run seed`
 * - products and reviews (replacing all products);
 * - with SEED_ADMIN_PASSWORD: the owner account "admin";
 * - with `--demo` (or DEMO_MODE=true): everything the public demo has — demo accounts,
 *   orders and promo codes — via the same reset that runs every night in demo mode.
 * Refuses to run with NODE_ENV=production unless `--force` is passed.
 */
import { connectDb, disconnectDb } from '../src/config/db.js'
import { env } from '../src/config/env.js'
import { seedCatalog, seedOwner, seedReviews } from '../src/seed/catalog.js'
import { resetDemoData } from '../src/seed/demo.js'

const main = async () => {
	if (env.isProduction && !process.argv.includes('--force')) {
		throw new Error('Refusing to wipe products in production. Pass --force if you are sure.')
	}

	await connectDb(env.MONGO_URL)

	if (process.argv.includes('--demo') || env.DEMO_MODE) {
		const result = await resetDemoData()
		console.log(
			`Demo shop ready: ${result.products} products, ${result.orders} orders, demo accounts "demo" and "demo-admin"`,
		)
	} else {
		const products = await seedCatalog()
		console.log(`Seeded ${products.length} products`)
		console.log(`Seeded reviews for ${await seedReviews(products)} products`)
	}

	if (process.env.SEED_ADMIN_PASSWORD) {
		await seedOwner(process.env.SEED_ADMIN_PASSWORD)
		console.log('Owner account "admin" is ready')
	}
}

main()
	.catch((err) => {
		console.error(err.message)
		process.exitCode = 1
	})
	.finally(disconnectDb)
