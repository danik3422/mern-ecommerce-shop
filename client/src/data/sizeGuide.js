/** Body measurements in centimetres used by the size guide. */
export const CLOTHING_SIZES = [
	{ size: 'XS', chest: '80–84', waist: '62–66', hips: '86–90' },
	{ size: 'S', chest: '85–89', waist: '67–71', hips: '91–95' },
	{ size: 'M', chest: '90–95', waist: '72–77', hips: '96–101' },
	{ size: 'L', chest: '96–102', waist: '78–84', hips: '102–107' },
	{ size: 'XL', chest: '103–110', waist: '85–92', hips: '108–114' },
]

/** Jeans are sized by waist in inches. */
export const JEANS_SIZES = [24, 26, 28, 30, 32, 34, 36].map((inches) => ({
	size: String(inches),
	waist: `${Math.round(inches * 2.54)}`,
}))
