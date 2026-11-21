import { useSearchParams } from 'react-router'

/**
 * List filters and page kept in the URL (shareable, survive reloads).
 * @param defaults e.g. `{ q: '', status: '' }`
 * @returns `{ values, params, page, setParam, setParams, setPage }` — `params` has only
 *   non-empty values
 */
export const useListParams = (defaults) => {
	const [searchParams, setSearchParams] = useSearchParams()

	const values = Object.fromEntries(
		Object.entries(defaults).map(([name, fallback]) => [name, searchParams.get(name) ?? fallback]),
	)
	const page = Number(searchParams.get('page')) || 1

	const update = (changes) => {
		const next = new URLSearchParams(searchParams)
		for (const [name, value] of Object.entries(changes)) {
			if (value) next.set(name, value)
			else next.delete(name)
		}
		setSearchParams(next, { replace: true })
	}

	const params = Object.fromEntries(Object.entries(values).filter(([, value]) => value))

	return {
		values,
		params: { ...params, page },
		page,
		// changing a filter starts from the first page again
		setParam: (name, value) => update({ [name]: value, page: null }),
		/** Several filters at once, e.g. `{ status: '', q: '' }` to clear them. */
		setParams: (changes) => update({ ...changes, page: null }),
		setPage: (next) => update({ page: next > 1 ? String(next) : null }),
	}
}
