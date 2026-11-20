import { capitalize } from '../utils/text'

/** "Biały" for "white"; unknown colors fall back to the capitalized stored name. */
export const colorName = (t, color) => t(`colors.${color}`, { defaultValue: capitalize(color) })

/** Translated title of a category slug, e.g. "Jeansy i spodnie" for "jeans". */
export const categoryTitle = (t, slug) =>
	t(`categoryTitles.${slug}`, { defaultValue: capitalize(slug) })
