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

/** Languages of the product description; English is required, Polish falls back to it. */
export const DESCRIPTION_LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'pl', label: 'Polish' },
]

export const DESCRIPTION_MAX_LENGTH = 4000

/** `{ en, pl }` from the API; plain strings (older products) are English. */
export const toDescriptionForm = (description) =>
	typeof description === 'string'
		? { en: description, pl: '' }
		: { en: description?.en ?? '', pl: description?.pl ?? '' }

/** True when the product has no Polish description yet (the shop then shows English). */
export const isMissingPolish = (form) => !form.description.pl.trim()

export const emptyProductForm = () => ({
	title: '',
	slug: '',
	brand: '',
	description: { en: '', pl: '' },
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
	description: toDescriptionForm(product.description),
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
		description: { en: form.description.en.trim(), pl: form.description.pl.trim() },
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

/**
 * Checks the form before it is sent, with friendlier messages than the API's.
 * Keys use the API's error paths, so the same fields light up.
 * Images are left to the API: a product may be prepared before its photos exist.
 */
export const validateProductForm = (form) => {
	const errors = {}
	const required = { title: 'Enter a title', slug: 'Enter a URL slug', brand: 'Enter a brand' }
	for (const [name, message] of Object.entries(required)) {
		if (!form[name].trim()) errors[name] = message
	}
	if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
		errors.slug = 'Use lowercase letters, digits and dashes'
	}
	if (!form.description.en.trim()) errors['description.en'] = 'Enter the English description'
	for (const { code, label } of DESCRIPTION_LANGUAGES) {
		if (form.description[code].trim().length > DESCRIPTION_MAX_LENGTH) {
			errors[`description.${code}`] =
				`${label} description: at most ${DESCRIPTION_MAX_LENGTH} characters`
		}
	}

	const price = form.price === '' ? NaN : Number(form.price)
	const compareAtPrice = form.compareAtPrice === '' ? null : Number(form.compareAtPrice)
	if (!(price >= 0)) errors.price = 'Enter a price of 0 or more'
	else if (compareAtPrice !== null && !(compareAtPrice > price)) {
		errors.compareAtPrice = 'Compare-at price must be higher than the price'
	}

	form.variants.forEach((variant, index) => {
		if (!variant.color.trim()) errors[`variants.${index}.color`] = 'Enter a color'
		variant.sizes.forEach((size, sizeIndex) => {
			if (!size.label.trim()) errors[`variants.${index}.sizes.${sizeIndex}.label`] = 'Enter a size'
			if (size.stock !== '' && !(Number(size.stock) >= 0 && Number.isInteger(Number(size.stock)))) {
				errors[`variants.${index}.sizes.${sizeIndex}.stock`] = 'Whole number, 0 or more'
			}
		})
	})
	return errors
}

/** True when the form would save something different from `saved`. */
export const isFormChanged = (form, saved) =>
	JSON.stringify(formToPayload(form, { isNew: false })) !==
	JSON.stringify(formToPayload(saved, { isNew: false }))
