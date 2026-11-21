import mongoose from 'mongoose'

/** What a staff member did in the admin panel, e.g. "product.update" of "Wool Coat". */
const activityLogSchema = new mongoose.Schema(
	{
		actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		// kept so entries stay readable after the account is removed
		actorName: String,
		action: { type: String, required: true },
		target: {
			type: new mongoose.Schema({ kind: String, id: String, label: String }, { _id: false }),
		},
		details: String,
	},
	{ timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)

activityLogSchema.index({ createdAt: -1 })

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema)
