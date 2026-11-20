/**
 * A product as the API returns it (public view), built from compact options.
 * `colors` + `sizes` create identical variants; pass `variants` for full control.
 */
export const makeProduct = ({
	colors = ['green'],
	sizes = [
		{ label: 'M', stock: 0 },
		{ label: 'L', stock: 2 },
	],
	images = ['https://example.com/coat.png'],
	variants,
	...overrides
} = {}) => {
	const productVariants = variants ?? colors.map((color) => ({ color, images, sizes }))
	const price = overrides.price ?? 120
	const compareAtPrice = overrides.compareAtPrice
	const onSale = Boolean(compareAtPrice && compareAtPrice > price)
	return {
		_id: 'p1',
		slug: 'arrow-jacket',
		title: 'Arrow Jacket',
		brand: 'Aster',
		description: 'Warm jacket',
		categories: ['coats'],
		price,
		rating: { average: 0, count: 0 },
		active: true,
		...overrides,
		variants: productVariants,
		images: productVariants[0].images,
		colors: productVariants.map((v) => v.color),
		inStock: productVariants.some((v) => v.sizes.some((s) => s.stock > 0)),
		onSale,
		discountPercent: onSale ? Math.round((1 - price / compareAtPrice) * 100) : 0,
	}
}
