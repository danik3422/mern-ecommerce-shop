import { MongoMemoryServer } from 'mongodb-memory-server'

/** Starts one in-memory MongoDB for the whole test run. */
export default async function setup({ provide }) {
	const mongo = await MongoMemoryServer.create()
	provide('mongoUrl', mongo.getUri('shop-test'))
	return () => mongo.stop()
}
