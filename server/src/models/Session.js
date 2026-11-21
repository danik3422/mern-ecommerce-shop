import mongoose from 'mongoose'

/**
 * One signed-in device. The refresh token itself is never stored — only its SHA-256 hash,
 * so a leaked database does not let anyone sign in (see services/sessions.js).
 */
const sessionSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		tokenHash: { type: String, required: true },
		// hash of the token replaced by the last rotation: recognises a concurrent refresh
		// from another tab (grace period) and, after that, token reuse
		previousTokenHash: String,
		rotatedAt: Date,
		lastUsedAt: { type: Date, default: Date.now },
		// sliding expiry, moved forward on every refresh; MongoDB deletes the document after it
		expiresAt: { type: Date, required: true },
		// for the "Active sessions" list
		browser: String,
		os: String,
		mobile: Boolean,
		ip: String,
		// a revoked session is kept until it expires, so a reused token is still recognised
		revokedAt: Date,
		// logout | revoked | others | password | reuse | blocked | removed
		revokedReason: String,
	},
	{ timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = mongoose.model('Session', sessionSchema)
