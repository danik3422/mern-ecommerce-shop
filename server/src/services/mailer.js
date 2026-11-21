import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transport

const getTransport = () => {
	transport ??= nodemailer.createTransport(env.SMTP_URL)
	return transport
}

/**
 * Sends an email through SMTP when SMTP_URL is configured; otherwise logs its text version,
 * so development and tests never need a mail server.
 * @param html optional HTML version; mail clients show it, the text is the fallback
 */
export const sendMail = async ({ to, subject, text, html }) => {
	if (!env.SMTP_URL) {
		if (!env.isTest) console.info(`[mail] to ${to}: ${subject}\n${text}`)
		return
	}
	await getTransport().sendMail({ from: env.MAIL_FROM, to, subject, text, html })
}
