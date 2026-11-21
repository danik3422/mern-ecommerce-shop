import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { fetchInvoice, orderKeys } from '../../api/orders'
import { useAuth } from '../../auth/useAuth'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { colorName } from '../../i18n/catalogText'
import { INTL_LOCALES, LOCALES } from '../../i18n/translate'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import style from './InvoicePage.module.css'

/*
 * Why a print page instead of a generated PDF file: the browser's "Save as PDF" turns this
 * A4 page into a PDF with selectable text, embeds the web font (so Polish letters such as
 * ą, ę, ł, ż come out right) and needs no PDF library on the server or in the bundle.
 * The print styles in InvoicePage.module.css hide everything except the invoice sheet.
 */

const intlLocale = (locale) => INTL_LOCALES[locale] ?? 'en-GB'

/** Formatters for the invoice: amounts with two decimals, dates as on Polish invoices. */
const useInvoiceFormat = () => {
	const { locale } = useI18n()
	const number = new Intl.NumberFormat(intlLocale(locale), {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
	const date = new Intl.DateTimeFormat(intlLocale(locale), {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		// invoice dates are the shop's local dates
		timeZone: 'Europe/Warsaw',
	})
	return {
		amount: (value) => number.format(value),
		money: (value, currency) => `${number.format(value)} ${currency}`,
		date: (value) => (value ? date.format(new Date(value)) : '—'),
	}
}

/** Where "Back" leads: the page that opened the invoice, else the order page. */
const backTarget = (location, orderId, token) => {
	if (location.state?.from) return location.state.from
	if (token) return `/checkout/success?order=${orderId}&token=${encodeURIComponent(token)}`
	return `/account/orders/${orderId}`
}

/**
 * /orders/:id/invoice — the VAT invoice of a paid order as an A4 page; "Download PDF" opens
 * the print dialog. For the customer, a guest with `?token=` and staff with order access.
 */
const InvoicePage = () => {
	const { id } = useParams()
	const [searchParams] = useSearchParams()
	const token = searchParams.get('token') ?? undefined
	const location = useLocation()
	const { user, isRestoring } = useAuth()
	const { t, locale, setLocale } = useI18n()

	const invoice = useQuery({
		queryKey: orderKeys.invoice(id),
		queryFn: ({ signal }) => fetchInvoice(id, signal, token),
		enabled: !isRestoring && Boolean(user || token),
		retry: (count, error) => error.response?.status !== 404 && count < 2,
	})
	useDocumentTitle(invoice.data && t('invoice.pageTitle', { number: invoice.data.number }))

	const back = backTarget(location, id, token)

	let content
	if (!isRestoring && !user && !token) {
		content = (
			<Message title={t('invoice.signIn')}>
				<Button as={Link} to='/login' state={{ from: location.pathname }}>
					{t('checkout.signIn')}
				</Button>
			</Message>
		)
	} else if (invoice.isError) {
		const missing = [400, 404].includes(invoice.error.response?.status)
		content = (
			<Message title={missing ? t('invoice.notFound') : t('checkout.error')}>
				<p>{missing ? t('invoice.notReady') : getErrorMessage(invoice.error)}</p>
			</Message>
		)
	} else if (!invoice.data) {
		content = <Message title={t('invoice.loading')} busy />
	} else {
		content = <InvoiceSheet invoice={invoice.data} />
	}

	return (
		<div className={style.page}>
			<div className={style.toolbar}>
				<Link to={back} className={style.back}>
					<ArrowLeft size={16} aria-hidden /> {t('invoice.back')}
				</Link>
				<div className={style.tools}>
					<div className={style.languages} role='group' aria-label='Language / Język'>
						{LOCALES.map((code) => (
							<button
								key={code}
								type='button'
								className={cx(style.language, code === locale && style.activeLanguage)}
								aria-pressed={code === locale}
								onClick={() => setLocale(code)}
							>
								{code.toUpperCase()}
							</button>
						))}
					</div>
					{invoice.data && (
						<>
							<span className={style.printHint}>{t('invoice.printHint')}</span>
							<Button size='sm' onClick={() => window.print()}>
								<Printer size={16} aria-hidden /> {t('invoice.print')}
							</Button>
						</>
					)}
				</div>
			</div>
			{content}
		</div>
	)
}

const Message = ({ title, busy = false, children }) => (
	<div className={style.message} aria-busy={busy || undefined} role={busy ? 'status' : undefined}>
		<h1 className={style.messageTitle}>{title}</h1>
		{children}
	</div>
)

/** Name and details of an invoice line, e.g. "Aster Wool Coat — Black, M". */
const lineName = (t, line) => {
	if (line.kind === 'shipping') {
		const method = line.shippingMethodId
			? t(`delivery.${line.shippingMethodId}`, { defaultValue: line.name })
			: line.name
		return { name: t('invoice.delivery', { method }) }
	}
	const details = [line.color && colorName(t, line.color), line.size].filter(Boolean).join(', ')
	return { name: line.name, details }
}

/** The A4 invoice itself — the only thing that is printed. */
export const InvoiceSheet = ({ invoice }) => {
	const { t, locale } = useI18n()
	const format = useInvoiceFormat()
	const { currency, seller, buyer, payment, totals } = invoice
	const hasDiscount = invoice.lines.some((line) => line.discount > 0)
	const amountDue = payment.paid ? 0 : totals.gross

	return (
		<article className={style.sheet} aria-labelledby='invoice-title'>
			<header className={style.head}>
				<p className={style.brand}>{seller.name}</p>
				<div className={style.titleBlock}>
					<h1 id='invoice-title' className={style.title}>
						{t('invoice.title')}
						{/* Polish is the legal language of the document */}
						{locale !== 'pl' && (
							<span className={style.titleNative} lang='pl'>
								Faktura VAT
							</span>
						)}
					</h1>
					<p className={style.number}>
						{t('invoice.number')} <strong>{invoice.number}</strong>
					</p>
				</div>
			</header>

			<dl className={style.dates}>
				<div>
					<dt>{t('invoice.issueDate')}</dt>
					<dd>{format.date(invoice.issueDate)}</dd>
				</div>
				<div>
					<dt>{t('invoice.saleDate')}</dt>
					<dd>{format.date(invoice.saleDate)}</dd>
				</div>
				{invoice.placeOfIssue && (
					<div>
						<dt>{t('invoice.placeOfIssue')}</dt>
						<dd>{invoice.placeOfIssue}</dd>
					</div>
				)}
				<div>
					<dt>{t('invoice.orderRef')}</dt>
					<dd>#{invoice.order.number}</dd>
				</div>
			</dl>

			<div className={style.parties}>
				<section aria-labelledby='invoice-seller'>
					<h2 id='invoice-seller' className={style.partyTitle}>
						{t('invoice.seller')}
					</h2>
					<address className={style.address}>
						<strong>{seller.name}</strong>
						{seller.street && <span>{seller.street}</span>}
						{(seller.postalCode || seller.city) && (
							<span>
								{seller.postalCode} {seller.city}
							</span>
						)}
						{seller.nip && (
							<span>
								{t('invoice.nip')}: {seller.nip}
							</span>
						)}
						{seller.email && <span>{seller.email}</span>}
						{seller.phone && <span>{seller.phone}</span>}
					</address>
				</section>
				<section aria-labelledby='invoice-buyer'>
					<h2 id='invoice-buyer' className={style.partyTitle}>
						{t('invoice.buyer')}
					</h2>
					<address className={style.address}>
						<strong>{buyer.name}</strong>
						<span>{buyer.street}</span>
						<span>
							{buyer.postalCode} {buyer.city}
						</span>
						<span>{buyer.country}</span>
						<span>{buyer.email}</span>
					</address>
				</section>
			</div>

			<dl className={style.payment}>
				<div>
					<dt>{t('invoice.paymentMethod')}</dt>
					<dd>{t(`invoice.methods.${payment.method}`)}</dd>
				</div>
				<div>
					<dt>{t('invoice.payment')}</dt>
					<dd>
						{payment.paid
							? t('invoice.paidOn', { date: format.date(payment.paidAt) })
							: t('invoice.unpaid')}
					</dd>
				</div>
				{seller.bankAccount && (
					<div>
						<dt>{t('invoice.bankAccount')}</dt>
						<dd className={style.nowrap}>{seller.bankAccount}</dd>
					</div>
				)}
			</dl>

			<div className={style.tableWrap}>
				<table className={style.lines}>
					<thead>
						<tr>
							<th scope='col'>{t('invoice.columns.no')}</th>
							<th scope='col' className={style.nameColumn}>
								{t('invoice.columns.name')}
							</th>
							<th scope='col'>{t('invoice.columns.qty')}</th>
							<th scope='col'>{t('invoice.columns.unit')}</th>
							<th scope='col'>{t('invoice.columns.unitPrice')}</th>
							{hasDiscount && <th scope='col'>{t('invoice.columns.discount')}</th>}
							<th scope='col'>{t('invoice.columns.net')}</th>
							<th scope='col'>{t('invoice.columns.rate')}</th>
							<th scope='col'>{t('invoice.columns.vat')}</th>
							<th scope='col'>{t('invoice.columns.gross')}</th>
						</tr>
					</thead>
					<tbody>
						{invoice.lines.map((line, index) => {
							const { name, details } = lineName(t, line)
							return (
								<tr key={index}>
									<td>{index + 1}</td>
									<td className={style.nameColumn}>
										{name}
										{details && <span className={style.details}>{details}</span>}
									</td>
									<td>{line.quantity}</td>
									<td>{line.kind === 'shipping' ? t('invoice.service') : t('invoice.pcs')}</td>
									<td>{format.amount(line.unitPrice)}</td>
									{hasDiscount && (
										<td>{line.discount > 0 ? `−${format.amount(line.discount)}` : '—'}</td>
									)}
									<td>{format.amount(line.net)}</td>
									<td>{line.vatRate}%</td>
									<td>{format.amount(line.vat)}</td>
									<td className={style.strong}>{format.amount(line.gross)}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>

			<div className={style.summaryRow}>
				<table className={style.vatTable}>
					<caption>{t('invoice.summary')}</caption>
					<thead>
						<tr>
							<th scope='col'>{t('invoice.columns.rate')}</th>
							<th scope='col'>{t('invoice.columns.net')}</th>
							<th scope='col'>{t('invoice.columns.vat')}</th>
							<th scope='col'>{t('invoice.columns.gross')}</th>
						</tr>
					</thead>
					<tbody>
						{totals.byRate.map((row) => (
							<tr key={row.rate}>
								<td>{row.rate}%</td>
								<td>{format.amount(row.net)}</td>
								<td>{format.amount(row.vat)}</td>
								<td>{format.amount(row.gross)}</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr>
							<th scope='row'>{t('invoice.total')}</th>
							<td>{format.amount(totals.net)}</td>
							<td>{format.amount(totals.vat)}</td>
							<td>{format.amount(totals.gross)}</td>
						</tr>
					</tfoot>
				</table>

				<dl className={style.totals}>
					<div className={style.grandTotal}>
						<dt>{t('invoice.totalDue')}</dt>
						<dd data-testid='invoice-total'>{format.money(totals.gross, currency)}</dd>
					</div>
					<div>
						<dt>{t('invoice.amountPaid')}</dt>
						<dd>{format.money(payment.paid ? totals.gross : 0, currency)}</dd>
					</div>
					<div>
						<dt>{t('invoice.amountDue')}</dt>
						<dd>{format.money(amountDue, currency)}</dd>
					</div>
				</dl>
			</div>

			<footer className={style.footer}>
				<p>{t('invoice.pricesGross')}</p>
				<p>{t('invoice.issuedBy')}</p>
			</footer>
		</article>
	)
}

export default InvoicePage
