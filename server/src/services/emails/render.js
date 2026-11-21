import { toLocale } from '../../utils/localized.js'
import { formatters } from './format.js'
import en from './messages.en.js'
import pl from './messages.pl.js'

/**
 * Customer emails in English and Polish: one place for the texts (messages.{en,pl}.js)
 * and one layout that produces both the plain-text and the HTML version.
 */

const MESSAGES = { en, pl }

/** Texts and formatters of a language (unknown languages get English). */
export const emailLanguage = (value) => {
	const locale = toLocale(value)
	return { locale, m: MESSAGES[locale], f: formatters(locale) }
}

const escapeHtml = (value) =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const html = (value) => escapeHtml(value).replace(/\n/g, '<br>')

// ---- plain text ----

const textBlocks = (email) => {
	const blocks = [email.greeting, ...email.paragraphs]
	if (email.items) {
		blocks.push(
			[
				`${email.items.title}:`,
				...email.items.lines.map((line) =>
					line.amount ? `${line.text} — ${line.amount}` : line.text,
				),
			].join('\n'),
		)
		if (email.items.totals?.length) {
			blocks.push(email.items.totals.map((row) => `${row.label}: ${row.value}`).join('\n'))
		}
	}
	for (const section of email.sections ?? []) {
		const rows = section.rows.map((row) => (row.label ? `${row.label}: ${row.value}` : row.value))
		blocks.push([`${section.title}:`, ...rows].join('\n'))
	}
	for (const button of email.buttons ?? []) blocks.push(`${button.label}: ${button.url}`)
	if (email.footnote) blocks.push(email.footnote)
	blocks.push(email.signOff, '—', email.footer)
	return blocks.filter(Boolean).join('\n\n')
}

// ---- HTML (inline styles: email clients ignore stylesheets) ----

const COLORS = {
	ink: '#1d1b18',
	muted: '#6b665e',
	line: '#e7e2d9',
	page: '#f5f2ec',
	accent: '#1d1b18',
}
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const paragraph = (text, style = '') =>
	`<p style="margin:0 0 14px;font-size:15px;line-height:1.55;${style}">${html(text)}</p>`

const itemsHtml = ({ title, lines, totals = [] }) => {
	const cell = 'padding:8px 0;font-size:14px;line-height:1.4;vertical-align:top'
	const rows = lines
		.map(
			(line) =>
				`<tr><td style="${cell};border-bottom:1px solid ${COLORS.line}">${html(line.text)}</td>` +
				`<td align="right" style="${cell};border-bottom:1px solid ${COLORS.line};white-space:nowrap;padding-left:16px">${html(line.amount ?? '')}</td></tr>`,
		)
		.join('')
	const totalRows = totals
		.map((row) => {
			const weight = row.strong ? 'font-weight:700;font-size:15px' : `color:${COLORS.muted}`
			return (
				`<tr><td style="${cell};${weight}">${html(row.label)}</td>` +
				`<td align="right" style="${cell};${weight};white-space:nowrap">${html(row.value)}</td></tr>`
			)
		})
		.join('')
	return (
		`<h2 style="margin:24px 0 4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.muted}">${html(title)}</h2>` +
		`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}${totalRows}</table>`
	)
}

const sectionHtml = ({ title, rows }) =>
	`<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.muted}">${html(title)}</h2>` +
	rows
		.map((row) =>
			paragraph(row.label ? `${row.label}: ${row.value}` : row.value, 'margin-bottom:4px'),
		)
		.join('')

const buttonHtml = ({ label, url }, index) => {
	const primary = index === 0
	return (
		`<a href="${escapeHtml(url)}" style="display:inline-block;margin:8px 8px 0 0;padding:12px 22px;border-radius:999px;` +
		`font-size:14px;font-weight:700;text-decoration:none;border:1px solid ${COLORS.accent};` +
		(primary
			? `background:${COLORS.accent};color:#ffffff`
			: `background:#ffffff;color:${COLORS.accent}`) +
		`">${html(label)}</a>`
	)
}

const htmlDocument = (email, locale) => `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};color:${COLORS.ink};font-family:${FONT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px">
<tr><td style="padding:22px 32px;border-bottom:1px solid ${COLORS.line};font-size:17px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${html(email.shopName)}</td></tr>
<tr><td style="padding:30px 32px 8px">
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.25">${html(email.heading)}</h1>
${paragraph(email.greeting)}
${email.paragraphs.map((text) => paragraph(text)).join('\n')}
${email.items ? itemsHtml(email.items) : ''}
${(email.sections ?? []).map(sectionHtml).join('\n')}
${email.buttons?.length ? `<div style="margin:22px 0 8px">${email.buttons.map(buttonHtml).join('')}</div>` : ''}
${email.footnote ? paragraph(email.footnote, `font-size:13px;color:${COLORS.muted}`) : ''}
${paragraph(email.signOff, 'margin-top:22px')}
</td></tr>
<tr><td style="padding:18px 32px 24px;border-top:1px solid ${COLORS.line};font-size:12px;line-height:1.5;color:${COLORS.muted}">${html(email.footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

/**
 * Builds a ready-to-send email from its content.
 *
 * @param locale 'en' | 'pl' — sets the greeting, sign-off and footer language
 * @param shop `{ shopName, contactEmail }` from the shop settings
 * @param content `{ subject, heading, name?, paragraphs: string[],
 *   items?: { title, lines: [{ text, amount? }], totals?: [{ label, value, strong? }] },
 *   sections?: [{ title, rows: [{ label?, value }] }], buttons?: [{ label, url }], footnote? }`
 * @returns `{ subject, text, html }`
 */
export const renderEmail = (locale, shop, content) => {
	const { m } = emailLanguage(locale)
	const email = {
		...content,
		shopName: shop.shopName,
		greeting: m.common.greeting({ name: content.name }),
		signOff: m.common.signOff(shop),
		footer: m.common.footer(shop),
	}
	return {
		subject: email.subject,
		text: textBlocks(email),
		html: htmlDocument(email, toLocale(locale)),
	}
}
