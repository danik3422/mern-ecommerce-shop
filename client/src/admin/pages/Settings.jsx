import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { adminSettingsKey, fetchShopSettings, updateShopSettings } from '../../api/admin'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { shopKeys } from '../../api/shop'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import field from '../../components/ui/Field.module.css'
import TextField from '../../components/ui/TextField'
import { cx } from '../../utils/cx'
import PageHeader from '../components/PageHeader'
import QueryState from '../components/QueryState'
import table from '../components/Table.module.css'
import {
	DELIVERY_METHOD_NAMES,
	formToSettings,
	isFormChanged,
	settingsToForm,
} from '../settingsForm'
import style from './Settings.module.css'

/** /admin/settings — shop details, delivery, returns and inventory settings. */
const Settings = () => {
	const queryClient = useQueryClient()
	const settings = useQuery({
		queryKey: adminSettingsKey,
		queryFn: ({ signal }) => fetchShopSettings(signal),
	})
	const save = useMutation({
		mutationFn: updateShopSettings,
		onSuccess: (saved) => {
			queryClient.setQueryData(adminSettingsKey, saved)
			// the storefront caches its config for the whole session
			return queryClient.invalidateQueries({ queryKey: shopKeys.config })
		},
	})

	return (
		<>
			<PageHeader
				title='Settings'
				description='Shop details, delivery, returns and inventory. Saved changes apply to the shop right away.'
			/>
			<QueryState query={settings} label='the settings'>
				{(data) => <SettingsForm settings={data} mutation={save} />}
			</QueryState>
		</>
	)
}

/**
 * The settings form. `settings` are the last saved values; the form keeps its own copy
 * and compares it with them to show unsaved changes.
 */
const SettingsForm = ({ settings, mutation }) => {
	const saved = settingsToForm(settings)
	const [form, setForm] = useState(saved)
	const isChanged = isFormChanged(form, saved)

	const errors = getFieldErrors(mutation.error)
	const hasFieldErrors = Object.keys(errors).length > 0

	useLeaveWarning(isChanged)

	/** Sets a value by a path like `announcement.en` or `shippingMethods.1.price`. */
	const setPath = (path, value) =>
		setForm((current) => {
			const next = structuredClone(current)
			const keys = path.split('.')
			const parent = keys.slice(0, -1).reduce((object, key) => object[key], next)
			parent[keys.at(-1)] = value
			return next
		})

	/** Props for a text input bound to a form path, with its server error. */
	const bind = (path) => ({
		value: path.split('.').reduce((object, key) => object[key], form),
		onChange: (e) => setPath(path, e.target.value),
		error: errors[path],
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		mutation.mutate(formToSettings(form), {
			// show the values as the server stored them (trimmed, rounded, ...)
			onSuccess: (result) => setForm(settingsToForm(result)),
		})
	}

	const discard = () => {
		mutation.reset()
		setForm(saved)
	}

	return (
		<form className={style.form} onSubmit={handleSubmit} noValidate>
			<Section
				id='general'
				title='General'
				description='Your shop’s name and contact details, shown in the shop footer.'
			>
				<div className={style.grid}>
					<TextField
						label='Shop name'
						{...bind('shopName')}
						className={style.wide}
						maxLength={80}
						required
					/>
					<TextField
						label='Contact email'
						type='email'
						autoComplete='off'
						placeholder='hello@example.com'
						{...bind('contactEmail')}
					/>
					<TextField
						label='Contact phone'
						type='tel'
						autoComplete='off'
						placeholder='+48 123 456 789'
						{...bind('contactPhone')}
					/>
				</div>
				<fieldset className={style.group}>
					<legend className={style.groupTitle}>Announcement bar</legend>
					<p className={style.groupHint}>
						A short message at the top of every page, e.g. a sale or delivery news. Leave both empty
						to hide the bar; a missing Polish text falls back to English.
					</p>
					<div className={style.grid}>
						<TextField
							label='English'
							maxLength={160}
							{...bind('announcement.en')}
							hint={counter(form.announcement.en, 160)}
						/>
						<TextField
							label='Polish'
							lang='pl'
							maxLength={160}
							{...bind('announcement.pl')}
							hint={counter(form.announcement.pl, 160)}
						/>
					</div>
				</fieldset>
			</Section>

			<Section
				id='delivery'
				title='Delivery'
				description='Prices are in PLN, the shop’s fixed currency. Disabled methods are hidden in the shop and cannot be chosen at checkout.'
			>
				<TextField
					label='Free shipping from (PLN)'
					type='number'
					min='0'
					step='0.01'
					inputMode='decimal'
					className={style.narrow}
					{...bind('freeShippingFrom')}
					hint='Orders reaching this amount after discounts ship free with the methods marked below. Leave empty or 0 for no free shipping.'
				/>
				<DeliveryTable form={form} errors={errors} setPath={setPath} bind={bind} />
				{errors.shippingMethods && (
					<p className={field.error} role='alert'>
						{errors.shippingMethods}
					</p>
				)}
			</Section>

			<div className={style.columns}>
				<Section
					id='returns'
					title='Returns'
					description='How long customers can return delivered items.'
				>
					<TextField
						label='Return window (days)'
						type='number'
						min='1'
						max='365'
						step='1'
						inputMode='numeric'
						{...bind('returnWindowDays')}
						hint='Counted from delivery. Shown in the shop and checked when a return is requested.'
					/>
				</Section>
				<Section id='inventory' title='Inventory' description='When a size counts as running out.'>
					<TextField
						label='Low stock threshold'
						type='number'
						min='0'
						max='1000'
						step='1'
						inputMode='numeric'
						{...bind('lowStockThreshold')}
						hint='Sizes with this many items or fewer are listed as low stock on the dashboard and in the products list.'
					/>
				</Section>
			</div>

			<div className={style.footer}>
				<div className={style.status}>
					{mutation.isError ? (
						<Alert tone='error'>
							{hasFieldErrors
								? 'Some settings are not valid — please fix the highlighted fields.'
								: `Could not save: ${getErrorMessage(mutation.error)}`}
						</Alert>
					) : isChanged ? (
						<p className={style.unsaved}>
							<span className={style.dot} aria-hidden /> Unsaved changes
						</p>
					) : (
						mutation.isSuccess && <Alert tone='success'>Settings saved.</Alert>
					)}
				</div>
				<div className={style.buttons}>
					<Button variant='ghost' onClick={discard} disabled={!isChanged || mutation.isPending}>
						Discard changes
					</Button>
					<Button type='submit' disabled={!isChanged || mutation.isPending}>
						{mutation.isPending ? 'Saving…' : 'Save settings'}
					</Button>
				</div>
			</div>
		</form>
	)
}

const counter = (value, max) => `${value.length}/${max} characters`

/** A titled panel of the settings form. */
const Section = ({ id, title, description, children }) => (
	<section className={cx(table.panel, style.section)} aria-labelledby={`${id}-title`}>
		<header>
			<h2 id={`${id}-title`} className={style.sectionTitle}>
				{title}
			</h2>
			{description && <p className={style.sectionDescription}>{description}</p>}
		</header>
		{children}
	</section>
)

/** The fixed delivery methods as rows: names in both languages, price, days and switches. */
const DeliveryTable = ({ form, errors, setPath, bind }) => (
	<div className={cx(table.scroll, style.tableWrap)}>
		<table className={cx(table.table, style.deliveryTable)}>
			<caption className='visually-hidden'>Delivery methods</caption>
			<thead>
				<tr>
					<th scope='col'>Method</th>
					<th scope='col'>Name in English</th>
					<th scope='col'>Name in Polish</th>
					<th scope='col'>Price (PLN)</th>
					<th scope='col'>Delivery time (working days)</th>
					<th scope='col'>Free over threshold</th>
					<th scope='col'>Enabled</th>
				</tr>
			</thead>
			<tbody>
				{form.shippingMethods.map((method, index) => {
					const path = `shippingMethods.${index}`
					const name = DELIVERY_METHOD_NAMES[method.id] ?? method.id
					return (
						<tr key={method.id} className={cx(!method.enabled && style.disabledRow)}>
							<th scope='row' className={style.methodName}>
								{name}
								{!method.enabled && <span className={style.offBadge}>Off</span>}
							</th>
							<td data-label='Name in English'>
								<CellInput
									label={`${name}: name in English`}
									{...bind(`${path}.label.en`)}
									maxLength={60}
								/>
							</td>
							<td data-label='Name in Polish'>
								<CellInput
									label={`${name}: name in Polish`}
									lang='pl'
									{...bind(`${path}.label.pl`)}
									maxLength={60}
								/>
							</td>
							<td data-label='Price (PLN)'>
								<CellInput
									label={`${name}: price in PLN`}
									type='number'
									min='0'
									step='0.01'
									inputMode='decimal'
									className={style.priceInput}
									{...bind(`${path}.price`)}
								/>
							</td>
							<td data-label='Delivery time (days)'>
								<div className={style.days}>
									<CellInput
										label={`${name}: at least (days)`}
										type='number'
										min='0'
										max='60'
										step='1'
										inputMode='numeric'
										className={style.dayInput}
										{...bind(`${path}.days.0`)}
									/>
									<span aria-hidden>–</span>
									<CellInput
										label={`${name}: at most (days)`}
										type='number'
										min='0'
										max='60'
										step='1'
										inputMode='numeric'
										className={style.dayInput}
										{...bind(`${path}.days.1`)}
									/>
								</div>
								{errors[`${path}.days`] && <p className={field.error}>{errors[`${path}.days`]}</p>}
							</td>
							<td data-label='Free over threshold'>
								<Switch
									label={`${name}: free over the threshold`}
									checked={method.freeShipping}
									onChange={(checked) => setPath(`${path}.freeShipping`, checked)}
								/>
							</td>
							<td data-label='Enabled'>
								<Switch
									label={`${name}: enabled`}
									checked={method.enabled}
									onChange={(checked) => setPath(`${path}.enabled`, checked)}
								/>
							</td>
						</tr>
					)
				})}
			</tbody>
		</table>
	</div>
)

/** A compact input for a table cell: the label is for screen readers, errors show below. */
const CellInput = ({ label, error, className, ...props }) => {
	const id = useId()
	return (
		<div className={style.cell}>
			<input
				id={id}
				aria-label={label}
				aria-invalid={Boolean(error)}
				aria-describedby={error ? `${id}-error` : undefined}
				className={cx(field.control, style.cellInput, error && field.invalid, className)}
				{...props}
			/>
			{error && (
				<p id={`${id}-error`} className={field.error}>
					{error}
				</p>
			)}
		</div>
	)
}

/** A checkbox styled as a switch. */
const Switch = ({ label, checked, onChange }) => (
	<label className={style.switch}>
		<input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} />
		<span className={style.track} aria-hidden />
		<span className='visually-hidden'>{label}</span>
	</label>
)

/** Asks the browser to confirm closing or reloading the tab while there are unsaved changes. */
const useLeaveWarning = (active) => {
	useEffect(() => {
		if (!active) return
		const warn = (e) => e.preventDefault()
		window.addEventListener('beforeunload', warn)
		return () => window.removeEventListener('beforeunload', warn)
	}, [active])
}

export default Settings
