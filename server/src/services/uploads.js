import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { env } from '../config/env.js'
import { HttpError, badRequest } from '../utils/HttpError.js'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Image types we accept, recognised by their first bytes ("magic numbers").
 * The Content-Type sent by the browser is not trusted.
 */
const SIGNATURES = [
	{ ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	{ ext: 'png', matches: (b) => b.subarray(0, 8).equals(PNG_SIGNATURE) },
	{
		ext: 'webp',
		matches: (b) =>
			b.subarray(0, 4).toString('ascii') === 'RIFF' &&
			b.subarray(8, 12).toString('ascii') === 'WEBP',
	},
]

/** @returns 'jpg' | 'png' | 'webp' | null */
export const detectImageType = (buffer) =>
	SIGNATURES.find((signature) => buffer.length >= 12 && signature.matches(buffer))?.ext ?? null

const parseSingleImage = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single('image')

/** Multer middleware with its errors turned into client errors (413 / 400). */
export const receiveImage = (req, res, next) =>
	parseSingleImage(req, res, (err) => {
		if (!err) return next()
		if (err.code === 'LIMIT_FILE_SIZE') {
			return next(new HttpError(413, `Image must be at most ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`))
		}
		if (err instanceof multer.MulterError) return next(badRequest(err.message))
		next(err)
	})

export const uploadDir = () => path.resolve(env.UPLOAD_DIR)

/**
 * Validates and stores an uploaded image under a random name.
 * @returns the public URL, e.g. `/uploads/3f9a…c1.jpg`
 */
export const saveImage = async (file) => {
	if (!file) throw badRequest('Attach an image in the "image" field')

	const ext = detectImageType(file.buffer)
	if (!ext) throw badRequest('Only JPEG, PNG and WebP images are allowed')

	const name = `${randomBytes(16).toString('hex')}.${ext}`
	await mkdir(uploadDir(), { recursive: true })
	await writeFile(path.join(uploadDir(), name), file.buffer, { flag: 'wx' })
	return `/uploads/${name}`
}
