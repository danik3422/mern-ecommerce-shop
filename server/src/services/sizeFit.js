import mongoose from 'mongoose'
import { Review } from '../models/Review.js'

/** How a product fits according to a review. */
export const FIT_VALUES = ['small', 'true', 'large']

/** At least this many fit answers before a verdict is shown. */
export const MIN_FIT_ANSWERS = 3
/** Share of answers one way needed for a verdict. */
export const VERDICT_SHARE = 0.6

/**
 * Summary of the fit answers: `{ counts: { small, true, large }, total, verdict, share }`.
 * `verdict` is 'small' | 'true' | 'large' when enough reviewers agree, else null;
 * `share` is the share (0..1) of answers behind the verdict.
 */
export const summarizeFit = (counts) => {
	const total = FIT_VALUES.reduce((sum, fit) => sum + (counts[fit] ?? 0), 0)
	const full = Object.fromEntries(FIT_VALUES.map((fit) => [fit, counts[fit] ?? 0]))
	if (total < MIN_FIT_ANSWERS) return { counts: full, total, verdict: null, share: 0 }

	const [top] = FIT_VALUES.toSorted((a, b) => full[b] - full[a])
	const share = full[top] / total
	return {
		counts: full,
		total,
		verdict: share >= VERDICT_SHARE ? top : null,
		share: Math.round(share * 100) / 100,
	}
}

/** Fit summary of a product's reviews, see `summarizeFit`. */
export const getFitSummary = async (productId) => {
	const groups = await Review.aggregate([
		{
			$match: {
				product: new mongoose.Types.ObjectId(String(productId)),
				fit: { $in: FIT_VALUES },
			},
		},
		{ $group: { _id: '$fit', count: { $sum: 1 } } },
	])
	return summarizeFit(Object.fromEntries(groups.map((group) => [group._id, group.count])))
}
