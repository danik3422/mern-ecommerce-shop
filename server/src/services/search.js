/**
 * Typo-tolerant product search.
 *
 * The active catalog is small, so its words are kept in an in-memory index (rebuilt when any
 * product changes) and every query is scored in JavaScript:
 * - text is normalized: lowercase, no Polish diacritics, split into words;
 * - a query word matches a product word exactly, as a prefix ("jack" → "jacket"), or — only
 *   when no catalog word matches it that way — within a Damerau-Levenshtein distance
 *   ("jaket" → "jacket", "nortline" → "Northline"); that last case is a corrected query;
 * - every query word must match; brand and title matches weigh more than categories and
 *   the description (English and Polish).
 * Categories are searchable by their English and Polish names, and common Polish product
 * words ("kurtka", "sukienka") find the English titles.
 */
import { Product } from '../models/Product.js'
import { toLocalizedText } from '../utils/localized.js'

/** Lowercase, without diacritics ("Płaszcz" → "plaszcz"); ł does not decompose, so it is mapped. */
export const normalize = (text) =>
	String(text ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/ł/g, 'l')

/**
 * Words of a text; hyphenated words also give the joined form ("t-shirts" → t, shirts, tshirts).
 */
export const tokenize = (text) => {
	const words = []
	for (const part of normalize(text).split(/[^\p{L}\p{N}-]+/u)) {
		const pieces = part.split('-').filter(Boolean)
		words.push(...pieces)
		if (pieces.length > 1) words.push(pieces.join(''))
	}
	return words.filter(Boolean)
}

/**
 * Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions).
 * Stops early and returns `max + 1` once the distance is certainly above `max`.
 */
export const editDistance = (a, b, max = Infinity) => {
	if (Math.abs(a.length - b.length) > max) return max + 1
	let previous2 = []
	let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
	for (let i = 1; i <= a.length; i++) {
		const current = [i]
		let rowMin = i
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, previous2[j - 2] + 1)
			}
			current.push(value)
			rowMin = Math.min(rowMin, value)
		}
		if (rowMin > max) return max + 1
		previous2 = previous
		previous = current
	}
	return previous[b.length]
}

/** Typos allowed in a query word: none in short words, where they would match anything. */
const allowedTypos = (word) => (word.length < 4 ? 0 : word.length < 7 ? 1 : 2)

/**
 * Names of the storefront categories in both languages (the client shows the same names),
 * plus a few words people search for.
 */
const CATEGORY_NAMES = {
	women: ['Women', 'Kobiety', 'damskie', 'damski'],
	men: ['Men', 'Mężczyźni', 'męskie', 'męski'],
	dresses: ['Dresses', 'Sukienki'],
	coats: ['Coats & jackets', 'Płaszcze i kurtki', 'płaszcz', 'kurtka'],
	jeans: ['Jeans & trousers', 'Denim', 'Jeansy i spodnie', 'dżinsy'],
	tshirts: ['T-shirts', 'Tees', 'Koszulki'],
	shirts: ['Shirts', 'Koszule'],
	accessories: ['Accessories', 'Dodatki'],
}

/** Polish (and a few English) words added to products whose title or category has the key. */
const PRODUCT_SYNONYMS = {
	tee: ['koszulka', 't-shirt'],
	shirt: ['koszula'],
	sweatshirt: ['bluza', 'sweater', 'sweter'],
	hoodie: ['bluza', 'sweater', 'sweter'],
	poncho: ['sweter', 'sweater', 'ponczo'],
	joggers: ['spodnie', 'dresy'],
	tracksuit: ['dres'],
	jeans: ['dżinsy', 'jeansy', 'spodnie'],
	chinos: ['spodnie', 'trousers'],
	dress: ['sukienka'],
	coat: ['płaszcz'],
	jacket: ['kurtka'],
	bomber: ['kurtka', 'jacket'],
	blazer: ['marynarka', 'jacket'],
	cap: ['czapka', 'hat'],
	beanie: ['czapka', 'hat'],
	hat: ['kapelusz'],
	bag: ['torba', 'torebka'],
	daypack: ['plecak', 'backpack', 'bag'],
	sunglasses: ['okulary'],
}

/** How much a match in each field counts. */
const WEIGHTS = { brand: 3, title: 2.5, synonyms: 1.6, categories: 1.4, description: 0.6 }

// match strength before the field weight
const EXACT = 1
const PREFIX = 0.8
const TYPO = 0.6

/** Words of the English and Polish description (both are searchable in either language). */
const descriptionWords = (description) => {
	const { en, pl } = toLocalizedText(description)
	return tokenize(`${en} ${pl}`).filter((word) => word.length > 2)
}

/** Index of one product: its words per field. */
const indexProduct = (product) => {
	const title = tokenize(product.title)
	const categories = (product.categories ?? []).flatMap((slug) => [
		...tokenize(slug),
		...(CATEGORY_NAMES[slug] ?? []).flatMap(tokenize),
	])
	const synonyms = [...title, ...categories].flatMap((word) =>
		(PRODUCT_SYNONYMS[word] ?? []).flatMap(tokenize),
	)
	return {
		id: product._id,
		brand: product.brand,
		title: normalize(product.title),
		categories: product.categories ?? [],
		fields: {
			brand: new Set(tokenize(product.brand)),
			title: new Set(title),
			synonyms: new Set(synonyms),
			categories: new Set(categories),
			description: new Set(descriptionWords(product.description)),
		},
	}
}

/**
 * Builds the search index of active products.
 * `vocabulary` maps every normalized word to the way it is written (for "Showing results for").
 */
export const buildIndex = (products) => {
	const entries = products.map(indexProduct)
	const vocabulary = new Map()
	const remember = (text) => {
		for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
			const key = normalize(word)
			if (key && !vocabulary.has(key)) vocabulary.set(key, word)
		}
	}
	for (const product of products) {
		remember(product.brand)
		remember(product.title)
	}
	for (const names of Object.values(CATEGORY_NAMES)) names.forEach(remember)
	for (const words of Object.values(PRODUCT_SYNONYMS)) words.forEach(remember)
	// description words can be matched exactly but are never offered as a correction
	const exactOnly = new Set(entries.flatMap((entry) => [...entry.fields.description]))
	return { entries, vocabulary, exactOnly }
}

/** Strength of a query word against a product word (0 = no match). */
const matchWord = (query, word, typos) => {
	if (word === query) return EXACT
	if (word.startsWith(query)) return PREFIX + 0.15 * (query.length / word.length)
	if (!typos) return 0
	// typo in a whole word ("jaket"), or in the beginning of one while typing ("nortl")
	const distance = Math.min(
		editDistance(query, word, typos),
		word.length > query.length ? editDistance(query, word.slice(0, query.length), typos) : Infinity,
	)
	return distance <= typos ? TYPO - 0.1 * (distance - 1) : 0
}

/** Best match of a query word in a set of words. */
const bestIn = (query, words, typos) => {
	let best = 0
	for (const word of words) {
		best = Math.max(best, matchWord(query, word, typos))
		if (best === EXACT) break
	}
	return best
}

/** Score of a product for the query words (0 when a word does not match). */
const scoreEntry = (entry, words) => {
	let total = 0
	for (const { text, typos } of words) {
		let best = 0
		for (const [field, weight] of Object.entries(WEIGHTS)) {
			// descriptions are long and full of short words, so only exact words count there
			const score =
				field === 'description'
					? entry.fields.description.has(text)
						? EXACT
						: 0
					: bestIn(text, entry.fields[field], typos)
			best = Math.max(best, score * weight)
		}
		if (!best) return 0
		total += best
	}
	return total
}

/** Whether a word matches some catalog word exactly or as a prefix (so it needs no correction). */
const isKnown = (index, word) => {
	if (index.exactOnly.has(word)) return true
	for (const known of index.vocabulary.keys()) if (known.startsWith(word)) return true
	return index.entries.some((entry) =>
		Object.entries(entry.fields).some(
			([field, words]) => field !== 'description' && [...words].some((w) => w.startsWith(word)),
		),
	)
}

/**
 * The catalog word closest to a misspelled one, or null when nothing is close enough.
 * The beginning of a longer word counts too, so "nortl" (still typing) finds "Northline".
 */
const closestWord = (index, word) => {
	const typos = allowedTypos(word)
	if (!typos) return null
	let best = null
	for (const [key, written] of index.vocabulary) {
		const whole = editDistance(word, key, typos)
		const start =
			key.length > word.length ? editDistance(word, key.slice(0, word.length), typos) : Infinity
		const distance = Math.min(whole, start)
		if (distance > typos) continue
		// closer first, whole words before beginnings, then a similar length
		const rank = [distance, whole <= typos ? 0 : 1, Math.abs(key.length - word.length)]
		if (!best || compareRanks(rank, best.rank) < 0) best = { rank, written }
	}
	return best?.written ?? null
}

const compareRanks = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

/**
 * Query words with their allowed typos; single letters are ignored when there are longer words
 * ("płaszcze i kurtki" searches for "płaszcze kurtki").
 */
const queryWords = (query) => {
	const words = [...new Set(tokenize(query))]
	const meaningful = words.filter((word) => word.length > 1)
	return meaningful.length ? meaningful : words
}

/**
 * Searches the index.
 * @param exact true: no typo tolerance (the visitor asked for exactly what they typed)
 * @returns `{ ids: ranked product ids, correctedQuery: string | null, words }`
 */
export const searchIndex = (index, query, { exact = false } = {}) => {
	const words = queryWords(query)
	if (!words.length) return { ids: [], correctedQuery: null, words }

	let corrected = false
	const parts = words.map((text) => {
		if (exact || isKnown(index, text)) return { text, typos: 0, shown: text }
		const correction = closestWord(index, text)
		if (!correction) return { text, typos: 0, shown: text }
		corrected = true
		return { text, typos: allowedTypos(text), shown: correction }
	})

	const phrase = normalize(query).trim()
	const scored = []
	for (const entry of index.entries) {
		const score = scoreEntry(entry, parts)
		if (!score) continue
		// the whole query at the start of the title or brand ranks first
		const bonus = [entry.title, normalize(entry.brand)].some((text) => text.startsWith(phrase))
			? 1
			: 0
		scored.push({ id: entry.id, score: score + bonus })
	}
	scored.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))

	return {
		ids: scored.map((item) => item.id),
		correctedQuery: corrected && scored.length ? parts.map((part) => part.shown).join(' ') : null,
		words: parts,
	}
}

/** Brands whose name matches every query word, best first. */
export const matchBrands = (index, query) => {
	const words = queryWords(query)
	const brands = new Map()
	for (const entry of index.entries) {
		if (brands.has(entry.brand)) continue
		let total = 0
		for (const word of words) {
			const score = bestIn(word, entry.fields.brand, allowedTypos(word))
			if (!score) {
				total = 0
				break
			}
			total += score
		}
		if (total) brands.set(entry.brand, total)
	}
	return [...brands].sort((a, b) => b[1] - a[1]).map(([brand]) => brand)
}

/** Category slugs whose name (English or Polish) matches every query word, best first. */
export const matchCategories = (query) => {
	const words = queryWords(query)
	const matches = []
	for (const [slug, names] of Object.entries(CATEGORY_NAMES)) {
		const categoryWords = new Set([slug, ...names.flatMap(tokenize)])
		let total = 0
		for (const word of words) {
			const score = bestIn(word, categoryWords, allowedTypos(word))
			if (!score) {
				total = 0
				break
			}
			total += score
		}
		if (total) matches.push({ slug, total })
	}
	return matches.sort((a, b) => b.total - a.total).map((match) => match.slug)
}

// ---- cache ----

let cached = null
let building = null

/** Changes whenever a product is added, edited (timestamps) or removed. */
const catalogVersion = async () => {
	const [stats] = await Product.aggregate([
		{ $group: { _id: null, count: { $sum: 1 }, latest: { $max: '$updatedAt' } } },
	])
	return stats ? `${stats.count}:${stats.latest?.getTime() ?? 0}` : 'empty'
}

/**
 * The index of active products, rebuilt only after products change.
 * Checking the version costs one small aggregation instead of loading every product.
 */
export const getSearchIndex = async () => {
	const version = await catalogVersion()
	if (cached?.version === version) return cached.index
	if (building?.version === version) return building.promise

	const promise = Product.find({ active: true })
		.select('title brand categories description')
		.lean()
		.then((products) => {
			const index = buildIndex(products)
			cached = { version, index }
			return index
		})
		.finally(() => {
			if (building?.promise === promise) building = null
		})
	building = { version, promise }
	return promise
}

/** Ranked ids of active products matching a query. See `searchIndex`. */
export const searchProducts = async (query, options) =>
	searchIndex(await getSearchIndex(), query, options)
