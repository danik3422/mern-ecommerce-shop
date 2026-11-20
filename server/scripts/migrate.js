/**
 * Brings database indexes in line with the Mongoose schemas: `npm run migrate`
 *
 * Drops indexes that no schema defines any more (e.g. the unique `carts.userId_1` left
 * from the first schema version, which made every cart after the first one fail with 409)
 * and creates missing ones. Run it after deploying schema changes; it is safe to repeat.
 * It does not run on server start on purpose, so manually created indexes are never
 * dropped without someone deciding to.
 */
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../src/config/db.js'
import { env } from '../src/config/env.js'
import '../src/models/Cart.js'
import '../src/models/Order.js'
import '../src/models/Product.js'
import '../src/models/Review.js'
import '../src/models/User.js'

const main = async () => {
	await connectDb(env.MONGO_URL)

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
