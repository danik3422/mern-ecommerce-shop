import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { env } from './config/env.js'

const SHUTDOWN_TIMEOUT_MS = 10_000

const start = async () => {
	await connectDb(env.MONGO_URL)
	console.log('Connected to MongoDB')

	const server = createApp().listen(env.PORT, () => {
		console.log(`API is running on http://localhost:${env.PORT}`)
	})

	const shutdown = (signal) => {
		console.log(`${signal} received, shutting down...`)
		setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref()
		server.close(async () => {
			await disconnectDb()
			process.exit(0)
		})
	}
	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
}

start().catch((err) => {
	console.error('Failed to start the API:', err.message)
	process.exit(1)
})
