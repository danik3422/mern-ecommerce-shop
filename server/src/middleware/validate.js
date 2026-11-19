/**
 * Validates parts of the request with zod schemas.
 * Parsed (typed, trimmed, defaulted) values are stored in `req.valid`,
 * because Express 5 does not allow overwriting `req.query`.
 *
 * @example router.get('/', validate({ query: listQuerySchema }), controller)
 */
export const validate = (schemas) => (req, _res, next) => {
	req.valid ??= {}
	for (const [part, schema] of Object.entries(schemas)) {
		// a ZodError is turned into a 400 response by the error handler
		req.valid[part] = schema.parse(req[part] ?? {})
	}
	next()
}
