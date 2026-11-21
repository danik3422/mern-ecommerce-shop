import mongoose from 'mongoose'

/**
 * Small key–value records the app keeps for itself, e.g. when the demo data was last reset.
 * Not touched by the demo reset, so the record survives it.
 */
const appStateSchema = new mongoose.Schema(
	{ _id: String, value: mongoose.Schema.Types.Mixed },
	{ timestamps: true, versionKey: false },
)

export const AppState = mongoose.model('AppState', appStateSchema)
