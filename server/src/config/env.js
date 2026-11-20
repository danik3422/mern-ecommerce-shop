import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().positive().default(8000),
	MONGO_URL: z.string().min(1, 'MONGO_URL is required'),
	JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
	JWT_EXPIRES_IN: z.string().default('3d'),
	// Comma-separated list of origins allowed by CORS
	CLIENT_URL: z.string().default('http://localhost:3000'),
	// Max failed login/register attempts per IP per 15 minutes
	AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
	// Number of reverse proxies in front of the API (needed for correct client IPs)
	TRUST_PROXY: z.coerce.number().int().min(0).default(0),
	// Directory for images uploaded in the admin panel (served at /uploads)
	UPLOAD_DIR: z.string().default('uploads'),
	// Stripe (optional): without a secret key orders are created unpaid ("pay later")
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
	const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
	console.error(`Invalid environment configuration:\n${problems.join('\n')}`)
	console.error('See server/.env.example')
	process.exit(1)
}

export const env = Object.freeze({
	...parsed.data,
	CLIENT_ORIGINS: parsed.data.CLIENT_URL.split(',').map((origin) => origin.trim()),
	isProduction: parsed.data.NODE_ENV === 'production',
	isTest: parsed.data.NODE_ENV === 'test',
	paymentsEnabled: Boolean(parsed.data.STRIPE_SECRET_KEY),
})
