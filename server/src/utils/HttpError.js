/** An error that carries an HTTP status and is safe to show to the client. */
export class HttpError extends Error {
	constructor(status, message, details) {
		super(message)
		this.name = 'HttpError'
		this.status = status
		this.details = details
	}
}

export const badRequest = (message, details) => new HttpError(400, message, details)
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message)
export const forbidden = (message = 'You are not allowed to do that') => new HttpError(403, message)
export const notFound = (resource = 'Resource') => new HttpError(404, `${resource} not found`)
export const conflict = (message, details) => new HttpError(409, message, details)
