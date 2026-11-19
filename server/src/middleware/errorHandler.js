import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { HttpError } from '../utils/HttpError.js'

const DUPLICATE_KEY = 11000

export const notFoundHandler = (req, res) => {
	res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` })
}

/** Converts known error types into `{ status, message, details? }`. */
const toResponse = (err) => {
	if (err instanceof HttpError) {
		return { status: err.status, message: err.message, details: err.details }
	}
	if (err instanceof ZodError) {
		const details = err.issues.map((issue) => ({
			path: issue.path.join('.'),
			message: issue.message,
		}))
		return { status: 400, message: 'Validation failed', details }
	}
	if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
		return { status: 400, message: err.message }
	}
	if (err.code === DUPLICATE_KEY) {
		const field = Object.keys(err.keyValue ?? {})[0] ?? 'value'
		return { status: 409, message: `This ${field} is already taken` }
	}
	// Errors from express.json(): malformed JSON (400), body too large (413), ...
	if (err.type && err.status >= 400 && err.status < 500) {
		return { status: err.status, message: err.expose ? err.message : 'Bad request' }
	}
	return { status: 500, message: 'Internal server error' }
}

// Express recognizes error handlers by their four arguments, so `_next` must stay
export const errorHandler = (err, _req, res, _next) => {
	const { status, message, details } = toResponse(err)
	if (status >= 500) console.error(err)
	res.status(status).json(details ? { message, details } : { message })
}
