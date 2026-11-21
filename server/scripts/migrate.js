/**
 * Updates an existing database to the current models: `npm run migrate`
 *
 * 1. Data: converts products of the old format (colors, sizes and images on the product)
 *    into variants. Stock of a size is split between the colors, the first color gets
 *    the remainder, so the total stays the same.
 * 2. Data: accounts get a role. Former admins (`isAdmin: true`) become staff owners with
 *    every permission, everyone else a customer; the stored `isAdmin` flag is removed
 *    (the API still sends `isAdmin` = "is staff" to the client).
 * 3. Indexes:
 * Drops indexes that no schema defines any more (e.g. the unique `carts.userId_1` left
 * from the first schema version, which made every cart after the first one fail with 409)
 * and creates missing ones. Run it after deploying schema changes; it is safe to repeat.
 * It does not run on server start on purpose, so manually created indexes are never
 * dropped without someone deciding to.
 */
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { env } from '../src/config/env.js'
import { PERMISSION_NAMES } from '../src/services/permissions.js'
import '../src/models/ActivityLog.js'
import '../src/models/Cart.js'
import '../src/models/Order.js'
import '../src/models/Product.js'
import '../src/models/PromoCode.js'
import '../src/models/Review.js'
import '../src/models/StockAlert.js'
import '../src/models/User.js'

/** Splits `total` into `parts` whole numbers that add up to it. */
const split = (total, parts, index) => Math.floor(total / parts) + (index === 0 ? total % parts : 0)

const migrateProductsToVariants = async () => {
	const products = mongoose.connection.collection('products')
	const legacy = await products.find({ variants: { $exists: false } }).toArray()

	for (const product of legacy) {
		const colors = product.colors?.length ? product.colors : ['default']
		const variants = colors.map((color, index) => ({
			color,
			images: product.images ?? [],
			sizes: (product.sizes ?? []).map(({ label, stock }) => ({
				label,
				stock: split(stock, colors.length, index),
			})),
		}))
		await products.updateOne(
			{ _id: product._id },
			{ $set: { variants }, $unset: { colors: '', sizes: '', images: '' } },
		)
	}
	console.log(`products: ${legacy.length} converted to variants`)
}

const migrateAdminsToStaff = async () => {
	const users = mongoose.connection.collection('users')
	const owners = await users.updateMany(
		{ isAdmin: true },
		{
			$set: { role: 'staff', isOwner: true, permissions: PERMISSION_NAMES },
			$unset: { isAdmin: '' },
		},
	)
	const customers = await users.updateMany(
		{ role: { $exists: false } },
		{ $set: { role: 'customer' }, $unset: { isAdmin: '' } },
	)
	console.log(
		`users: ${owners.modifiedCount} admins became owners, ${customers.modifiedCount} customers got a role`,
	)
}

const main = async () => {
	await connectDb(env.MONGO_URL)
	await migrateProductsToVariants()
	await migrateAdminsToStaff()

	for (const model of Object.values(mongoose.models)) {
		const dropped = await model.syncIndexes()
		const status = dropped.length ? `dropped ${dropped.join(', ')}` : 'up to date'
		console.log(`${model.collection.collectionName}: ${status}`)
	}
}

main()
	.catch((err) => {
		console.error(err.message)
		process.exitCode = 1
	})
	.finally(disconnectDb)
