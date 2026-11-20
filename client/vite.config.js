import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// API_URL lets several dev stacks run side by side, e.g. API_URL=http://localhost:8101
const apiUrl = process.env.API_URL ?? 'http://localhost:8000'

export default defineConfig({
	plugins: [react()],
	server: {
		port: 3000,
		proxy: {
			'/api': apiUrl,
			'/uploads': apiUrl,
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.js'],
		css: false,
	},
})
