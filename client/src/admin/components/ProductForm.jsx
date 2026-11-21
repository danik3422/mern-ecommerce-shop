import { useEffect, useRef, useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { formatMoney } from '../../utils/money'
import { cx } from '../../utils/cx'
import { discountPercent } from '../pricing'
import {
	DESCRIPTION_LANGUAGES,
	emptyProductForm,
	formToPayload,
	isFormChanged,
	isMissingPolish,
	validateProductForm,
} from '../productForm'
import { slugify } from '../format'
import table from './Table.module.css'
import DescriptionField from './DescriptionField'
import TagInput from './TagInput'
import VariantsEditor from './VariantsEditor'
import style from './ProductForm.module.css'

const CATEGORY_SUGGESTIONS = ['women', 'men', 'tshirts', 'shirts', 'coats', 'jeans', 'accessories']

/** Asks before closing the tab while there are unsaved changes. */
const useWarnBeforeLeaving = (active) => {
	useEffect(() => {
		if (!active) return
		const warn = (e) => e.preventDefault()
		window.addEventListener('beforeunload', warn)
		return () => window.removeEventListener('beforeunload', warn)
	}, [active])
}

/**
 * Create/edit form for a product, with a sticky bar that shows unsaved changes.
 * @param initialValues form values (see productForm.js); omit for a new product
 * @param onSubmit called with the request body; may return a promise — when it resolves,
 *   the submitted values count as saved
 * @param mutation the TanStack mutation that saves (for pending and error state)
 */
const ProductForm = ({ initialValues, onSubmit, mutation, submitLabel, extraActions }) => {
	const isNew = !initialValues
	const [form, setForm] = useState(() => initialValues ?? emptyProductForm())
	// what is stored on the server; Discard goes back to it
	const [saved, setSaved] = useState(form)
	// a new product's slug follows its title until the slug is edited by hand
	const [slugEdited, setSlugEdited] = useState(!isNew)
	// checks run live once the user tried to save
	const [checked, setChecked] = useState(false)
	// language of the description tab and of the preview
	const [language, setLanguage] = useState('en')
	const formRef = useRef(null)

	const localErrors = checked ? validateProductForm(form) : {}
	const serverErrors = getFieldErrors(mutation.error)
	const errors = { ...serverErrors, ...localErrors }
	const hasLocalErrors = Object.keys(localErrors).length > 0
	const unmatchedError = mutation.isError && !Object.keys(serverErrors).length
	const isDirty = isNew || isFormChanged(form, saved)
	useWarnBeforeLeaving(!isNew && isDirty)

	const focusFirstError = () =>
		requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())

	/** Sets one field; `value` may be an updater function like in useState. */
	const setField = (name, value) =>
		setForm((current) => ({
			...current,
			[name]: typeof value === 'function' ? value(current[name]) : value,
		}))

	const handleTitle = (e) => {
		const title = e.target.value
		setForm((current) => ({
			...current,
			title,
			slug: slugEdited ? current.slug : slugify(title),
		}))
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setChecked(true)
		const formErrors = validateProductForm(form)
		if (Object.keys(formErrors).length) {
			// the invalid description may be in the other language's tab
			const invalidLanguage = DESCRIPTION_LANGUAGES.find(
				({ code }) => formErrors[`description.${code}`],
			)
			if (invalidLanguage && !formErrors[`description.${language}`]) {
				setLanguage(invalidLanguage.code)
			}
			focusFirstError()
			return
		}
		const submitted = form
		try {
			await onSubmit(formToPayload(submitted, { isNew }))
			setSaved(submitted)
		} catch {
			focusFirstError()
		}
	}

	const discard = () => {
		setForm(saved)
		setChecked(false)
		mutation.reset?.()
	}

	const previewImage = form.variants.find((variant) => variant.images.length)?.images[0]
	// what shoppers see in the preview language: Polish falls back to English
	const previewDescription = form.description[language].trim() || form.description.en.trim()
	const previewFallback = language === 'pl' && isMissingPolish(form) && previewDescription
	const discount = discountPercent(form.price, form.compareAtPrice)

	const text = (name) => ({
		name,
		value: form[name],
		onChange: (e) => setField(name, e.target.value),
		error: errors[name],
	})

	return (
		<form ref={formRef} className={style.form} onSubmit={handleSubmit} noValidate>
			<div className={style.columns}>
				<section className={`${table.panel} ${style.section}`} aria-labelledby='details-title'>
					<h2 id='details-title' className={style.sectionTitle}>
						Details
					</h2>
					<TextField label='Title' {...text('title')} onChange={handleTitle} required />
					<TextField
						label='URL slug'
						hint={`Shown in the address: /product/${form.slug || 'your-product'}`}
						{...text('slug')}
						onChange={(e) => {
							setSlugEdited(true)
							setField('slug', e.target.value)
						}}
						required
					/>
					<TextField label='Brand' {...text('brand')} required />
					<DescriptionField
						value={form.description}
						onChange={(value) => setField('description', value)}
						language={language}
						onLanguageChange={setLanguage}
						errors={errors}
					/>
					<TagInput
						label='Categories'
						hint='Press Enter to add. The first category is used for breadcrumbs.'
						values={form.categories}
						onChange={(value) => setField('categories', value)}
						suggestions={CATEGORY_SUGGESTIONS}
						error={errors.categories}
					/>
				</section>

				<div className={style.side}>
					<section className={`${table.panel} ${style.preview}`} aria-label='Preview'>
						{previewImage ? (
							<img className={style.previewImage} src={previewImage} alt='' />
						) : (
							<div className={style.previewEmpty}>No photo yet</div>
						)}
						<div className={style.previewText}>
							<p className={style.previewBrand}>{form.brand || 'Brand'}</p>
							<p className={style.previewTitle}>{form.title || 'Product title'}</p>
							<p>
								{form.price !== '' && !Number.isNaN(Number(form.price))
									? formatMoney(Number(form.price))
									: '—'}
								{discount > 0 && (
									<>
										{' '}
										<s className={style.previewMuted}>
											{formatMoney(Number(form.compareAtPrice))}
										</s>{' '}
										<span className={style.previewSale}>−{discount}%</span>
									</>
								)}
							</p>
							{!form.active && <p className={style.previewMuted}>Hidden from the shop</p>}
						</div>
						<div className={style.previewDescription}>
							<div className={style.previewLanguage} role='group' aria-label='Preview language'>
								{DESCRIPTION_LANGUAGES.map(({ code }) => (
									<button
										key={code}
										type='button'
										aria-pressed={language === code}
										onClick={() => setLanguage(code)}
									>
										{code.toUpperCase()}
									</button>
								))}
							</div>
							<p lang={previewFallback ? 'en' : language}>
								{previewDescription || (
									<span className={style.previewMuted}>No description yet</span>
								)}
							</p>
							{previewFallback && (
								<p className={style.previewMuted}>Shown in English: no Polish translation yet.</p>
							)}
						</div>
					</section>

					<section className={`${table.panel} ${style.section}`} aria-labelledby='pricing-title'>
						<h2 id='pricing-title' className={style.sectionTitle}>
							Pricing
						</h2>
						<TextField
							label='Price (PLN)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							{...text('price')}
							required
						/>
						<TextField
							label='Compare-at price (PLN)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							hint='Original price for a sale. Leave empty for no discount.'
							{...text('compareAtPrice')}
						/>
					</section>

					<section className={`${table.panel} ${style.section}`} aria-labelledby='visibility-title'>
						<h2 id='visibility-title' className={style.sectionTitle}>
							Visibility
						</h2>
						<label className={style.toggle}>
							<input
								type='checkbox'
								checked={form.active}
								onChange={(e) => setField('active', e.target.checked)}
							/>
							<span>
								<strong>Visible in the shop</strong>
								<span className={style.toggleHint}>Hidden products are only shown here.</span>
							</span>
						</label>
					</section>
				</div>

				<section className={`${style.section} ${style.wide}`} aria-labelledby='variants-title'>
					<h2 id='variants-title' className={style.sectionTitle}>
						Colors, photos and stock
					</h2>
					<VariantsEditor
						variants={form.variants}
						onChange={(value) => setField('variants', value)}
						errors={errors}
					/>
				</section>
			</div>

			<div className={cx(style.footer, isDirty && !isNew && style.footerDirty)}>
				<p className={style.saveState} aria-live='polite'>
					{isNew ? (
						'New product'
					) : mutation.isPending ? (
						'Saving…'
					) : isDirty ? (
						<>
							<span className={style.dot} aria-hidden /> Unsaved changes
						</>
					) : (
						'All changes saved'
					)}
				</p>
				{(mutation.isError || hasLocalErrors) && (
					<Alert tone='error' className={style.error}>
						{unmatchedError && !hasLocalErrors
							? getErrorMessage(mutation.error)
							: 'Please fix the highlighted fields.'}
					</Alert>
				)}
				<div className={style.buttons}>
					{extraActions}
					{!isNew && (
						<Button variant='secondary' onClick={discard} disabled={!isDirty || mutation.isPending}>
							Discard
						</Button>
					)}
					<Button type='submit' disabled={mutation.isPending || !isDirty}>
						{mutation.isPending
							? 'Saving…'
							: (submitLabel ?? (isNew ? 'Create product' : 'Save changes'))}
					</Button>
				</div>
			</div>
		</form>
	)
}

export default ProductForm
