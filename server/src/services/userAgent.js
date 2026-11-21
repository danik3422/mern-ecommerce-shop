/**
 * A short description of a browser for the "Active sessions" list, e.g. Chrome on macOS.
 * Deliberately tiny: a few well-known tokens are enough to recognise one's own devices,
 * so no user-agent parsing library is needed. Order matters — Edge and Opera also say
 * "Chrome", and Chrome also says "Safari".
 */

const BROWSERS = [
	['Edge', /Edg(e|A|iOS)?\//],
	['Opera', /OPR\/|Opera/],
	['Samsung Internet', /SamsungBrowser\//],
	['Firefox', /Firefox\/|FxiOS\//],
	['Chrome', /Chrome\/|CriOS\//],
	['Safari', /Version\/[\d.]+.*Safari\//],
]

const SYSTEMS = [
	['iOS', /iPhone|iPad|iPod/],
	['Android', /Android/],
	['ChromeOS', /CrOS/],
	['Windows', /Windows/],
	['macOS', /Mac OS X|Macintosh/],
	['Linux', /Linux/],
]

const firstMatch = (list, text) => list.find(([, pattern]) => pattern.test(text))?.[0] ?? null

/** @returns {{ browser: string|null, os: string|null, mobile: boolean }} */
export const describeUserAgent = (userAgent = '') => {
	const text = String(userAgent).slice(0, 512)
	return {
		browser: firstMatch(BROWSERS, text),
		os: firstMatch(SYSTEMS, text),
		mobile: /Mobi|iPhone|iPod|Android.*Mobile/.test(text),
	}
}
