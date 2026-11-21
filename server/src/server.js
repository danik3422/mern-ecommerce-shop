import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { env } from './config/env.js'
import { User } from './models/User.js'
import { resetDemoData } from './seed/demo.js'
import { scheduleDemoReset } from './services/demoReset.js'

const SHUTDOWN_TIMEOUT_MS = 10_000

const start = async () => {
	await connectDb(env.MONGO_URL)
	console.log('Connected to MongoDB')

	if (env.DEMO_MODE) {
		// first start of a fresh demo database: create the demo data right away
		if (!(await User.exists({ isDemo: true }))) {
			const result = await resetDemoData()
			console.log(`Demo data created: ${result.products} products, ${result.orders} orders`)
		}
		scheduleDemoReset({ hour: env.DEMO_RESET_HOUR, timeZone: env.DEMO_TIMEZONE })
		console.log(
			`Demo mode: data resets every day at ${env.DEMO_RESET_HOUR}:00 (${env.DEMO_TIMEZONE})`,
		)
	}

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
