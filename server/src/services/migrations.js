import { Product } from '../models/Product.js'

/**
 * Data migrations shared by scripts/migrate.js and the tests. Each one is idempotent.
 */

/**
 * Product descriptions become translated texts: a string description is the English text,
 * `{ en: <string>, pl: '' }` (the Polish one is then written in the admin panel).
 * Only string descriptions are touched, so running it again changes nothing.
 * @returns how many products were converted
 */
export const migrateDescriptionsToLocalized = async () => {
	const result = await Product.collection.updateMany({ description: { $type: 'string' } }, [
		{ $set: { description: { en: '$description', pl: '' } } },
	])
	return result.modifiedCount
}
