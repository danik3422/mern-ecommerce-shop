// localStorage can throw (private mode, disabled storage) — never let that break the app.
export const load = (key, fallback) => {
	try {
		const raw = localStorage.getItem(key)
		return raw ? JSON.parse(raw) : fallback
	} catch {
		return fallback
	}
}

export const save = (key, value) => {
	try {
		if (value === null || value === undefined) localStorage.removeItem(key)
		else localStorage.setItem(key, JSON.stringify(value))
	} catch {
		/* ignore */
	}
}
