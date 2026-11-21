import { capitalize } from '../utils/text'

/** "Biały" for "white"; unknown colors fall back to the capitalized stored name. */
export const colorName = (t, color) => t(`colors.${color}`, { defaultValue: capitalize(color) })

/** Translated title of a category slug, e.g. "Jeansy i spodnie" for "jeans". */
export const categoryTitle = (t, slug) =>
	t(`categoryTitles.${slug}`, { defaultValue: capitalize(slug) })

/**
 * Name of a delivery method: the name edited in the admin settings for this language,
 * else the built-in translation.
 */
export const deliveryName = (t, locale, method) =>
	method.labels?.[locale] || t(`delivery.${method.id}`, { defaultValue: method.label })
