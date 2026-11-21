import mongoose from 'mongoose'

/**
 * Sequences that must never repeat, e.g. invoice numbers per month (`_id: 'invoice/2026/11'`).
 * Incremented atomically with $inc (see services/invoices.js).
 */
const counterSchema = new mongoose.Schema(
	{ _id: String, seq: { type: Number, default: 0 } },
	{ versionKey: false },
)

export const Counter = mongoose.model('Counter', counterSchema)
