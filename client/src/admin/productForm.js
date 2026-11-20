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

export const emptyProductForm = () => ({
	title: '',
	slug: '',
	brand: '',
	description: '',
	price: '',
	compareAtPrice: '',
	categories: [],
	colors: [],
	sizes: presetSizes('clothing'),
	images: [],
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
	colors: product.colors,
	sizes: product.sizes.map((size) => ({ label: size.label, stock: String(size.stock) })),
	images: product.images,
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
		colors: form.colors,
		sizes: form.sizes.map((size) => ({
			label: size.label.trim(),
			stock: toNumber(size.stock) ?? 0,
		})),
		images: form.images,
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
