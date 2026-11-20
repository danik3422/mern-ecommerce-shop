/**
 * Pure helpers for the admin product form.
 * Form values keep numbers as strings while editing, so inputs can be empty.
 */

export const SIZE_PRESETS = {
	clothing: ['XS', 'S', 'M', 'L', 'XL'],
	jeans: ['28', '30', '32', '34'],
	oneSize: ['One size'],
}

export const presetSizes = (preset) => SIZE_PRESETS[preset].map((label) => ({ label, stock: '0' }))

let variantKey = 0
/** A stable React key for a variant card (colors can be renamed while editing). */
const nextKey = () => `variant-${++variantKey}`

/** A new color; copies the size labels of `template` so stock only has to be filled in. */
export const newVariant = (template) => ({
	key: nextKey(),
	color: '',
	images: [],
	sizes: template
		? template.sizes.map(({ label }) => ({ label, stock: '0' }))
		: presetSizes('clothing'),
})

/**
 * Field errors of one variant without the `variants.<index>.` prefix,
 * so editors can look up `sizes.1.label` or `images` as usual.
 */
export const variantErrors = (errors, index) => {
	const prefix = `variants.${index}.`
	return Object.fromEntries(
		Object.entries(errors)
			.filter(([path]) => path.startsWith(prefix))
			.map(([path, message]) => [path.slice(prefix.length), message]),
	)
}

export const emptyProductForm = () => ({
	title: '',
	slug: '',
	brand: '',
	description: '',
	price: '',
	compareAtPrice: '',
	categories: [],
	variants: [newVariant()],
	active: true,
})

/** Product from the API → form values. */
export const productToForm = (product) => ({
	title: product.title,
	slug: product.slug,
	brand: product.brand,
	description: product.description,
	price: String(product.price),
	compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
	categories: product.categories,
	variants: product.variants.map((variant) => ({
		key: nextKey(),
		color: variant.color,
		images: variant.images,
		sizes: variant.sizes.map((size) => ({ label: size.label, stock: String(size.stock) })),
	})),
	active: product.active,
})

const toNumber = (value) => (value === '' || value === null ? undefined : Number(value))

/**
 * Form values → request body.
 * When editing, an empty compare-at price is sent as `null` so the discount is removed.
 */
export const formToPayload = (form, { isNew }) => {
	const compareAtPrice = toNumber(form.compareAtPrice)
	return {
		title: form.title.trim(),
		slug: form.slug.trim(),
		brand: form.brand.trim(),
		description: form.description.trim(),
		price: toNumber(form.price),
		...(compareAtPrice !== undefined ? { compareAtPrice } : isNew ? {} : { compareAtPrice: null }),
		categories: form.categories,
		variants: form.variants.map((variant) => ({
			color: variant.color.trim().toLowerCase(),
			images: variant.images,
			sizes: variant.sizes.map((size) => ({
				label: size.label.trim(),
				stock: toNumber(size.stock) ?? 0,
			})),
		})),
		active: form.active,
	}
}

/** Moves an item one step left (-1) or right (+1); out-of-range moves are ignored. */
export const moveItem = (items, index, direction) => {
	const target = index + direction
	if (target < 0 || target >= items.length) return items
	const next = [...items]
	;[next[index], next[target]] = [next[target], next[index]]
	return next
}
