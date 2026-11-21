import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { env } from './config/env.js'
import { User } from './models/User.js'
import { seedOwner } from './seed/catalog.js'
import { scheduleDemoReset } from './services/demoReset.js'

const SHUTDOWN_TIMEOUT_MS = 10_000

const start = async () => {
	await connectDb(env.MONGO_URL)
	console.log('Connected to MongoDB')

	// hosting without a shell: the owner account "admin" is created on the first start
	if (process.env.SEED_ADMIN_PASSWORD && !(await User.exists({ isOwner: true }))) {
		await seedOwner(process.env.SEED_ADMIN_PASSWORD)
		console.log('Owner account "admin" created')
	}

	if (env.DEMO_MODE) {
		// resets right away when the data was never reset or the last nightly reset was missed
		// (e.g. a free host was asleep at night), then every night
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
