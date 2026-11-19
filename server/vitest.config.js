import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		globalSetup: ['./tests/globalSetup.js'],
		setupFiles: ['./tests/setup.js'],
		// all test files share one in-memory MongoDB, so run them one at a time
		fileParallelism: false,
		testTimeout: 15000,
	},
})
